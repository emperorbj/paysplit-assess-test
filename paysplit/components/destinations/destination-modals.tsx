"use client"

import * as React from "react"

import { Field, FIELD } from "@/components/forms/field"
import {
  EMPTY_RECIPIENT,
  isRecipientValid,
  RecipientFields,
  type RecipientFormValue,
} from "@/components/forms/recipient-fields"
import {
  EMPTY_WALLET,
  isWalletValid,
  WalletFields,
  type WalletFormValue,
} from "@/components/forms/wallet-fields"
import { Button } from "@/components/ui/button"
import {
  Modal,
  ModalDescription,
  ModalDivider,
  ModalTitle,
} from "@/components/ui/modal"
import { LoadingButton } from "@/components/ui/loading-button"
import { MoneyInput } from "@/components/ui/money-input"
import { TexturedModalHeader } from "@/components/ui/textured-header"
import { formatNaira } from "@/lib/finance"

function ModalForm({
  onSubmit,
  children,
  footer,
}: {
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
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-6">
        {children}
      </div>
      <ModalDivider className="mt-0 mb-6 shrink-0" />
      <div className="grid shrink-0 grid-cols-2 gap-3 px-6 pb-6 sm:gap-4">
        {footer}
      </div>
    </form>
  )
}

const MODAL_CLASS =
  "flex max-h-[min(780px,calc(100svh-8rem))] max-w-[678px] flex-col"

/* --------------------------------- Wallet --------------------------------- */

export function WalletFormModal({
  open,
  onOpenChange,
  initialValue,
  onSave,
  onSaveAndCreateRule,
  pending = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Request in flight (spinner on the button that was pressed). */
  pending?: boolean
  /** Pass to edit an existing wallet; omit to create one. */
  initialValue?: WalletFormValue
  onSave: (value: WalletFormValue) => void
  /** Create flow only: save, then go set up a split rule for the wallet. */
  onSaveAndCreateRule?: (value: WalletFormValue) => void
}) {
  const isEdit = initialValue !== undefined
  const [value, setValue] = React.useState(initialValue ?? EMPTY_WALLET)
  const valid = isWalletValid(value)
  const [intent, setIntent] = React.useState<"save" | "rule">("save")

  return (
    <Modal open={open} onOpenChange={onOpenChange} className={MODAL_CLASS}>
      <TexturedModalHeader
        title={isEdit ? "Edit Wallet" : "Create New Wallet"}
      />
      <ModalForm
        onSubmit={() => {
          setIntent("save")
          onSave(value)
        }}
        footer={
          isEdit || !onSaveAndCreateRule ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="xl"
                className="border-input text-[#344054]"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <LoadingButton
                type="submit"
                size="xl"
                disabled={!valid || pending}
                loading={pending}
              >
                {isEdit ? "Save Changes" : "Save"}
              </LoadingButton>
            </>
          ) : (
            <>
              <LoadingButton
                type="submit"
                variant="outline"
                size="xl"
                disabled={!valid || pending}
                loading={pending && intent === "save"}
                className="border-input text-[#344054]"
              >
                Save
              </LoadingButton>
              <LoadingButton
                type="button"
                size="xl"
                disabled={!valid || pending}
                loading={pending && intent === "rule"}
                onClick={() => {
                  setIntent("rule")
                  onSaveAndCreateRule(value)
                }}
              >
                Create Rule
              </LoadingButton>
            </>
          )
        }
      >
        <WalletFields
          idPrefix="wallet-form"
          value={value}
          onChange={setValue}
        />
      </ModalForm>
    </Modal>
  )
}

/* ------------------------------- Beneficiary ------------------------------ */

export function BeneficiaryFormModal({
  open,
  onOpenChange,
  initialValue,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialValue?: RecipientFormValue
  onSave: (value: RecipientFormValue) => void
}) {
  const isEdit = initialValue !== undefined
  const [value, setValue] = React.useState(initialValue ?? EMPTY_RECIPIENT)

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      className={MODAL_CLASS}
      showClose={false}
    >
      <TexturedModalHeader
        title={
          isEdit ? "Edit Recipient/Beneficiary" : "Add Recipient/Beneficiary"
        }
      />
      <ModalForm
        onSubmit={() => onSave(value)}
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              size="xl"
              className="border-input text-[#344054]"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="xl" disabled={!isRecipientValid(value)}>
              {isEdit ? "Save Changes" : "Save Beneficiary"}
            </Button>
          </>
        }
      >
        <RecipientFields
          idPrefix="beneficiary-form"
          value={value}
          onChange={setValue}
        />
      </ModalForm>
    </Modal>
  )
}

/* ------------------------------- Move funds ------------------------------- */

export function MoveFundsModal({
  open,
  onOpenChange,
  walletName,
  available,
  onMove,
  pending = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletName: string
  /** naira */
  available: number
  /** amount in naira */
  onMove: (amount: number) => void
  pending?: boolean
}) {
  const [amount, setAmount] = React.useState<number | null>(null)
  const tooMuch = amount !== null && amount > available
  const valid = !!amount && !tooMuch

  return (
    <Modal open={open} onOpenChange={onOpenChange} className="max-w-[480px]">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (amount) onMove(amount)
        }}
      >
        <div className="px-6 pt-6">
          <ModalTitle className="pr-10 text-lg font-semibold text-ink">
            Move funds from {walletName}
          </ModalTitle>
          <ModalDescription className="mt-1 text-sm text-[#475467]">
            Send money from this wallet back to your salary account.
          </ModalDescription>

          <Field id="move-amount" label="Amount" className="mt-5">
            <MoneyInput
              id="move-amount"
              placeholder="e.g ₦50,000"
              value={amount}
              onValueChange={setAmount}
              aria-invalid={tooMuch || undefined}
              aria-describedby="move-amount-hint"
              className={FIELD}
              autoFocus
            />
          </Field>
          <p
            id="move-amount-hint"
            className={
              tooMuch
                ? "mt-2 text-sm text-destructive"
                : "mt-2 text-sm text-[#667085]"
            }
          >
            {tooMuch
              ? `You can move at most ${formatNaira(available)}.`
              : `Available: ${formatNaira(available)}`}{" "}
            {!tooMuch && available > 0 && (
              <button
                type="button"
                onClick={() => setAmount(available)}
                className="text-brand underline-offset-4 hover:underline"
              >
                Move all
              </button>
            )}
          </p>
        </div>
        <ModalDivider className="my-5" />
        <div className="grid grid-cols-2 gap-3 px-6 pb-6">
          <Button
            type="button"
            variant="outline"
            size="xl"
            className="border-input text-[#344054]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            size="xl"
            disabled={!valid}
            loading={pending}
          >
            Move funds
          </LoadingButton>
        </div>
      </form>
    </Modal>
  )
}
