"use client"

import * as React from "react"

import {
  BriefcaseIcon,
  DocumentTextIcon,
  ShareIcon,
  WalletIcon,
} from "@/components/icons/vuesax"
import {
  IncomeStep,
  RecipientStep,
  RuleStep,
  WalletStep,
  type IncomeDetails,
  type RecipientDetails,
  type RuleDetails,
  type WalletDetails,
} from "@/components/setup/setup-steps"
import { toRuleDto } from "@/components/forms/rule-fields"
import { EMPTY_WALLET, toWalletDto } from "@/components/forms/wallet-fields"
import { Modal, ModalDescription, ModalTitle } from "@/components/ui/modal"
import { useIncome, useSaveIncome } from "@/hooks/setup/use-setup"
import { useCreateSplitRule } from "@/hooks/split-rules/use-split-rules"
import { useCreateWallet, useUpdateWallet } from "@/hooks/wallets/use-wallets"
import { koboToNaira, nairaToKobo } from "@/lib/money"
import { cn } from "@/lib/utils"

const STEPS = [
  { title: "Income", subtitle: "Salary Info", Icon: BriefcaseIcon },
  { title: "Wallets", subtitle: "Savings Pocket", Icon: WalletIcon },
  { title: "Recipients", subtitle: "Beneficiary", Icon: DocumentTextIcon },
  { title: "Rules", subtitle: "Split Strategy", Icon: ShareIcon },
] as const

export type SetupResult = {
  income: IncomeDetails | null
  wallet: WalletDetails | null
  recipient: RecipientDetails | null
  rule: RuleDetails
}

export function SetupWizard({
  open,
  onOpenChange,
  onComplete,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: (result: SetupResult) => void
}) {
  const [step, setStep] = React.useState(0)
  const [income, setIncome] = React.useState<IncomeDetails | null>(null)
  const [wallet, setWallet] = React.useState<WalletDetails | null>(null)
  const [recipient, setRecipient] = React.useState<RecipientDetails | null>(
    null
  )
  // Steps 1–2 persist as you go: PUT /setup/income, then POST /wallets (or
  // PATCH it if the user comes back to the wallet step).
  // Step 4 creates the rule (POST /split-rules).
  // TODO: step 3 (beneficiary) once the beneficiaries endpoints are wired.
  const savedIncome = useIncome()
  const saveIncome = useSaveIncome()
  const [walletId, setWalletId] = React.useState<string | null>(null)
  const createWallet = useCreateWallet()
  const updateWallet = useUpdateWallet(walletId ?? "")
  const createRule = useCreateSplitRule()

  const incomeDefault: IncomeDetails =
    income ??
    (savedIncome.data
      ? {
          employer: savedIncome.data.employerName,
          monthlySalary: koboToNaira(savedIncome.data.monthlyAmount),
          payday: savedIncome.data.paydayDay,
        }
      : { employer: "", monthlySalary: null, payday: 28 })

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      // Capped height: tall steps scroll inside instead of reaching the top of the screen.
      className="flex max-h-[min(780px,calc(100svh-8rem))] max-w-[678px] flex-col"
      showClose={false}
    >
      <header className="relative shrink-0">
        {/* Grey wave texture fading to white, as in the design header */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[120px] bg-[url(/images/setup/header-texture.jpg)] bg-cover bg-top short:h-24"
        >
          <div className="absolute inset-0 bg-linear-to-t from-white from-35% to-white/0" />
        </div>
        <div className="relative px-6 pt-8 text-center short:pt-6">
          <ModalTitle className="text-2xl font-semibold tracking-tight text-[#101828]">
            Configure your Salary Partitions
          </ModalTitle>
          <ModalDescription className="mt-1.5 text-sm text-[#475467]">
            Complete {STEPS.length} steps to activate automated payroll
            distribution.
          </ModalDescription>
        </div>
      </header>

      <Stepper current={step} onStepClick={setStep} />

      {step === 0 && (
        <IncomeStep
          // Remount once the saved income arrives so the form is prefilled.
          key={savedIncome.data ? "saved" : "empty"}
          defaultValue={incomeDefault}
          pending={saveIncome.isPending}
          onSkip={() => onOpenChange(false)}
          onComplete={(value) =>
            saveIncome.mutate(
              {
                employerName: value.employer.trim(),
                monthlyAmount: nairaToKobo(value.monthlySalary) ?? 0,
                paydayDay: value.payday,
              },
              {
                onSuccess: () => {
                  setIncome(value)
                  setStep(1)
                },
              }
            )
          }
        />
      )}
      {step === 1 && (
        <WalletStep
          defaultValue={wallet ?? EMPTY_WALLET}
          pending={createWallet.isPending || updateWallet.isPending}
          onBack={() => setStep(0)}
          onComplete={(value) => {
            const next = () => {
              setWallet(value)
              setStep(2)
            }
            if (!walletId) {
              createWallet.mutate(toWalletDto(value), {
                onSuccess: (created) => {
                  setWalletId(created.id)
                  next()
                },
              })
            } else if (JSON.stringify(value) !== JSON.stringify(wallet)) {
              updateWallet.mutate(toWalletDto(value), { onSuccess: next })
            } else {
              next()
            }
          }}
        />
      )}
      {step === 2 && (
        <RecipientStep
          defaultValue={
            recipient ?? {
              bank: "",
              accountNumber: "",
              accountName: "",
              category: "Emergency",
              narration: "",
            }
          }
          onBack={() => setStep(1)}
          onComplete={(value) => {
            setRecipient(value)
            setStep(3)
          }}
        />
      )}
      {step === 3 && (
        <RuleStep
          wallet={wallet}
          walletId={walletId}
          salary={income?.monthlySalary ?? null}
          pending={createRule.isPending}
          onComplete={(rule) =>
            createRule.mutate(
              { ...toRuleDto(rule), status: "active" },
              {
                onSuccess: () =>
                  onComplete({ income, wallet, recipient, rule }),
              }
            )
          }
        />
      )}
    </Modal>
  )
}

function Stepper({
  current,
  onStepClick,
}: {
  current: number
  onStepClick: (step: number) => void
}) {
  return (
    <ol className="relative mt-5 grid shrink-0 grid-cols-4 px-4 short:mt-4">
      {STEPS.map(({ title, subtitle, Icon }, index) => {
        const reached = index <= current
        const isLast = index === STEPS.length - 1
        return (
          <li
            key={title}
            aria-current={index === current ? "step" : undefined}
            className="relative flex flex-col items-center text-center"
          >
            {/* Connector to the next step: full blue when passed, half + dot after the current step */}
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute top-6 left-[calc(50%+24px)] h-0.5 w-[calc(100%-48px)] -translate-y-1/2 bg-[#E4E4E4]"
              >
                {index < current && (
                  <span className="absolute inset-0 bg-brand" />
                )}
                {index === current && (
                  <>
                    <span className="absolute inset-y-0 left-0 w-[45%] bg-brand" />
                    <span className="absolute top-1/2 left-[45%] size-2.5 -translate-1/2 rounded-full bg-brand" />
                  </>
                )}
              </span>
            )}
            <button
              type="button"
              disabled={index >= current}
              onClick={() => onStepClick(index)}
              aria-label={
                index < current ? `Back to ${title}` : `${title} step`
              }
              className={cn(
                "relative grid size-12 place-items-center rounded-[10px] transition",
                reached
                  ? "bg-brand-50 text-brand"
                  : "border border-[#D9D9D9] bg-white text-[#C8C8C8]",
                index < current && "hover:ring-4 hover:ring-brand/15"
              )}
            >
              <Icon className="size-6" />
            </button>
            <span className="mt-2 text-base text-ink">{title}</span>
            <span className="text-xs text-[#475467]">{subtitle}</span>
          </li>
        )
      })}
    </ol>
  )
}
