"use client"

import * as React from "react"
import { Field, FIELD } from "@/components/forms/field"
import {
  isRecipientValid,
  RecipientFields,
  type RecipientFormValue,
} from "@/components/forms/recipient-fields"
import {
  emptyRule,
  isRuleValid,
  RuleFields,
  type RuleFormValue,
} from "@/components/forms/rule-fields"
import {
  isWalletValid,
  WalletFields,
  type WalletFormValue,
} from "@/components/forms/wallet-fields"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { ModalDivider } from "@/components/ui/modal"
import { MoneyInput } from "@/components/ui/money-input"
import { NativeSelect } from "@/components/ui/native-select"
import { formatNaira, ordinal } from "@/lib/finance"

/* ---------------------------------- Types --------------------------------- */

export type IncomeDetails = {
  employer: string
  monthlySalary: number | null
  payday: number
}

export type WalletDetails = WalletFormValue
export type RecipientDetails = RecipientFormValue

export type RuleDetails = RuleFormValue

/* --------------------------------- Shared --------------------------------- */

function StepForm({
  title,
  onSubmit,
  children,
  footer,
}: {
  title: string
  onSubmit: () => void
  children: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      {/* Only the fields scroll; the wizard header and the buttons stay put. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6 short:pb-4">
        <div
          aria-hidden="true"
          className="pointer-events-none sticky top-0 z-10 h-4 bg-linear-to-b from-white to-white/0 short:h-3"
        />
        <h3 className="text-lg font-medium text-ink">{title}</h3>
        <div className="mt-4 space-y-4 short:mt-3 short:space-y-3">
          {children}
        </div>
      </div>
      <ModalDivider className="mt-0 mb-6 shrink-0 short:mb-4" />
      <div className="flex shrink-0 gap-3 px-6 pb-6 *:flex-1 sm:gap-4">
        {footer}
      </div>
    </form>
  )
}

function SecondaryButton(props: React.ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      variant="outline"
      size="xl"
      className="border-input text-[#344054]"
      {...props}
    />
  )
}

function PrimaryButton(props: React.ComponentProps<typeof LoadingButton>) {
  return <LoadingButton type="submit" size="xl" {...props} />
}

/* --------------------------------- Income --------------------------------- */

export function IncomeStep({
  defaultValue,
  onSkip,
  onComplete,
  pending = false,
}: {
  defaultValue: IncomeDetails
  onSkip: () => void
  onComplete: (value: IncomeDetails) => void
  /** Saving in flight (spinner on Next) */
  pending?: boolean
}) {
  const [value, setValue] = React.useState(defaultValue)
  const valid = value.employer.trim() !== "" && !!value.monthlySalary

  return (
    <StepForm
      title="Salary Income Source"
      onSubmit={() => onComplete(value)}
      footer={
        <>
          <SecondaryButton onClick={onSkip}>Skip</SecondaryButton>
          <PrimaryButton disabled={!valid} loading={pending}>
            Next
          </PrimaryButton>
        </>
      }
    >
      <Field id="setup-employer" label="Employer">
        <Input
          id="setup-employer"
          placeholder="e.g Talent Nation"
          autoComplete="organization"
          value={value.employer}
          onChange={(e) =>
            setValue((v) => ({ ...v, employer: e.target.value }))
          }
          className={FIELD}
          required
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2 short:gap-3">
        <Field id="setup-salary" label="Monthly Salary Amount">
          <MoneyInput
            id="setup-salary"
            placeholder="₦850,000"
            value={value.monthlySalary}
            onValueChange={(monthlySalary) =>
              setValue((v) => ({ ...v, monthlySalary }))
            }
            className={FIELD}
            required
          />
        </Field>
        <Field id="setup-payday" label="Expected Payday Day of Month">
          <NativeSelect
            id="setup-payday"
            value={value.payday}
            onChange={(e) =>
              setValue((v) => ({ ...v, payday: Number(e.target.value) }))
            }
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                {ordinal(day)}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>
    </StepForm>
  )
}

/* --------------------------------- Wallet --------------------------------- */

export function WalletStep({
  defaultValue,
  onBack,
  onComplete,
  pending = false,
}: {
  defaultValue: WalletDetails
  onBack: () => void
  onComplete: (value: WalletDetails) => void
  pending?: boolean
}) {
  const [value, setValue] = React.useState(defaultValue)

  return (
    <StepForm
      title="Create First Wallet"
      onSubmit={() => onComplete(value)}
      footer={
        <>
          <SecondaryButton onClick={onBack}>Go Back</SecondaryButton>
          <PrimaryButton disabled={!isWalletValid(value)} loading={pending}>
            Next
          </PrimaryButton>
        </>
      }
    >
      <WalletFields idPrefix="setup-wallet" value={value} onChange={setValue} />
    </StepForm>
  )
}

/* -------------------------------- Recipient ------------------------------- */

export function RecipientStep({
  defaultValue,
  onBack,
  onComplete,
}: {
  defaultValue: RecipientDetails
  onBack: () => void
  onComplete: (value: RecipientDetails) => void
}) {
  const [value, setValue] = React.useState(defaultValue)

  return (
    <StepForm
      title="Create First Recipient/Beneficiary"
      onSubmit={() => onComplete(value)}
      footer={
        <>
          <SecondaryButton onClick={onBack}>Go Back</SecondaryButton>
          <PrimaryButton disabled={!isRecipientValid(value)}>
            Create Split Rule
          </PrimaryButton>
        </>
      }
    >
      <div className="rounded-2xl border border-line p-5 short:p-4">
        <RecipientFields
          idPrefix="setup-recipient"
          value={value}
          onChange={setValue}
        />
      </div>
    </StepForm>
  )
}

/* ---------------------------------- Rule ---------------------------------- */

export function RuleStep({
  wallet,
  walletId,
  salary,
  onComplete,
  pending = false,
}: {
  wallet: WalletDetails | null
  /** id of the wallet created in step 2 */
  walletId: string | null
  salary: number | null
  onComplete: (value: RuleDetails) => void
  pending?: boolean
}) {
  // During setup the only possible target is the wallet just created.
  // TODO: offer the step-3 beneficiary once beneficiaries are saved via the API.
  const walletOptions =
    wallet && walletId
      ? [
          {
            id: walletId,
            label: `${wallet.name} (current bal: ${formatNaira(0, { kobo: true })})`,
          },
        ]
      : []
  const [value, setValue] = React.useState<RuleDetails>(() =>
    emptyRule("wallet", walletOptions[0]?.id)
  )

  return (
    <StepForm
      title="Create First Split Rule"
      onSubmit={() => onComplete(value)}
      footer={
        <PrimaryButton disabled={!isRuleValid(value)} loading={pending}>
          Complete Setup &amp; Launch Dashboard
        </PrimaryButton>
      }
    >
      <RuleFields
        idPrefix="setup-rule"
        value={value}
        onChange={setValue}
        walletOptions={walletOptions}
        beneficiaryOptions={[]}
        emptyHint={{
          wallet: "No wallet yet — go back and create one",
          beneficiary: "Beneficiary payouts are coming soon",
        }}
        salary={salary ?? undefined}
      />
    </StepForm>
  )
}
