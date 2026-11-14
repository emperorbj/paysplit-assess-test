"use client"

import * as React from "react"
import { BanknoteIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input, Label } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Modal,
  ModalDescription,
  ModalDivider,
  ModalTitle,
} from "@/components/ui/modal"
import { MoneyInput } from "@/components/ui/money-input"
import { useSimulateSalaryCredit } from "@/hooks/simulations/use-simulate-salary"
import { koboToNaira, nairaToKobo } from "@/lib/money"
import { cn } from "@/lib/utils"

/**
 * Sandbox helper: pays a fake salary into the user's account so the split
 * can be seen working end to end. Shown once the salary account is active.
 */
export function SimulateSalaryButton({
  defaultAmount,
  defaultSender,
  className,
}: {
  /** kobo, usually the monthly salary */
  defaultAmount: number | null
  defaultSender: string | null
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [amount, setAmount] = React.useState<number | null>(null)
  const [sender, setSender] = React.useState("")
  const [autoSplit, setAutoSplit] = React.useState(true)
  // One key per opened form: a double-click or retry can't pay twice.
  const [idempotencyKey, setIdempotencyKey] = React.useState("")
  const simulate = useSimulateSalaryCredit()

  const openForm = () => {
    setAmount(koboToNaira(defaultAmount))
    setSender(defaultSender ?? "")
    setAutoSplit(true)
    setIdempotencyKey(crypto.randomUUID())
    setOpen(true)
  }

  const kobo = nairaToKobo(amount)

  return (
    <>
      <Button
        size="xl"
        variant="outline"
        onClick={openForm}
        className={cn(
          "border-white/30 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white dark:bg-white/5",
          className
        )}
      >
        <BanknoteIcon className="size-4" strokeWidth={1.75} />
        Simulate salary
      </Button>

      <Modal open={open} onOpenChange={setOpen}>
        <form
          className="pb-6"
          onSubmit={(event) => {
            event.preventDefault()
            if (!kobo) return
            simulate.mutate(
              {
                amount: kobo,
                senderName: sender.trim() || undefined,
                autoSplit,
                idempotencyKey,
              },
              { onSuccess: () => setOpen(false) }
            )
          }}
        >
          <div className="px-6 pt-6 pr-14">
            <ModalTitle className="text-xl font-medium text-[#101828]">
              Simulate a salary payment
            </ModalTitle>
            <ModalDescription className="mt-1 text-sm text-[#475467]">
              Sandbox only. Pays money into your salary account as if your
              employer sent it, then runs your split rules.
            </ModalDescription>
          </div>

          <div className="mt-6 space-y-4 px-6">
            <div className="space-y-2">
              <Label htmlFor="simulate-amount">Amount</Label>
              <MoneyInput
                id="simulate-amount"
                placeholder="₦0"
                value={amount}
                onValueChange={setAmount}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="simulate-sender">From (employer)</Label>
              <Input
                id="simulate-sender"
                placeholder="Employer name"
                value={sender}
                onChange={(e) => setSender(e.target.value)}
                maxLength={80}
              />
            </div>
            <Checkbox
              label="Split into my wallets straight away"
              checked={autoSplit}
              onCheckedChange={setAutoSplit}
            />
          </div>

          <ModalDivider />

          <div className="px-6">
            <LoadingButton
              type="submit"
              size="xl"
              className="w-full"
              disabled={!kobo}
              loading={simulate.isPending}
            >
              Pay salary
            </LoadingButton>
          </div>
        </form>
      </Modal>
    </>
  )
}
