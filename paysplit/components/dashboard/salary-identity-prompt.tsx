"use client"

import * as React from "react"

import { Field, FIELD } from "@/components/forms/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Modal,
  ModalDescription,
  ModalDivider,
  ModalTitle,
} from "@/components/ui/modal"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import {
  useAddSalaryIdentity,
  useSalaryAccount,
} from "@/hooks/salary-account/use-salary-account"
import {
  ADD_BVN_OR_NIN,
  type AddSalaryIdentityDto,
} from "@/types/api/salary-account"

const ID_TYPES = [
  { id: "bvn", label: "BVN" },
  { id: "nin", label: "NIN" },
] as const

/** Shown when the salary account can't be issued without a BVN or NIN. */
export function SalaryIdentityPrompt() {
  const account = useSalaryAccount()
  const [modal, setModal] = React.useState({ open: false, key: 0 })

  if (account.data?.actionRequired !== ADD_BVN_OR_NIN) return null

  return (
    <div className="mx-2 mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[20px] bg-brand-50 px-5 py-4 sm:mx-5">
      <div>
        <p className="font-medium text-ink">Add your BVN or NIN</p>
        <p className="mt-0.5 text-sm text-[#475467]">
          We need one of these to issue your salary account.
        </p>
      </div>
      <Button
        size="lg"
        className="h-10 px-4 text-sm"
        onClick={() => setModal((m) => ({ open: true, key: m.key + 1 }))}
      >
        Add BVN or NIN
      </Button>
      <SalaryIdentityModal
        key={modal.key}
        open={modal.open}
        onOpenChange={(open) => setModal((m) => ({ ...m, open }))}
      />
    </div>
  )
}

function SalaryIdentityModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [method, setMethod] =
    React.useState<AddSalaryIdentityDto["method"]>("bvn")
  const [idNumber, setIdNumber] = React.useState("")
  const addIdentity = useAddSalaryIdentity()
  const canSubmit = idNumber.length === 11

  return (
    <Modal open={open} onOpenChange={onOpenChange} className="max-w-[480px]">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSubmit || addIdentity.isPending) return
          addIdentity.mutate(
            { method, idNumber },
            { onSuccess: () => onOpenChange(false) }
          )
        }}
      >
        <div className="space-y-4 px-6 pt-6">
          <div>
            <ModalTitle className="pr-10 text-lg font-semibold text-ink">
              Add your BVN or NIN
            </ModalTitle>
            <ModalDescription className="mt-1 text-sm text-[#475467]">
              The name on this ID must match your verified identity.
            </ModalDescription>
          </div>
          <SegmentedTabs
            label="ID type"
            options={ID_TYPES}
            value={method}
            onChange={(next) => {
              setMethod(next)
              setIdNumber("")
            }}
          />
          <Field
            id="salary-identity-number"
            label={`${method.toUpperCase()} (11 digits)`}
            required
          >
            <Input
              id="salary-identity-number"
              inputMode="numeric"
              maxLength={11}
              autoComplete="off"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, ""))}
              className={FIELD}
              required
            />
          </Field>
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
            disabled={!canSubmit}
            loading={addIdentity.isPending}
          >
            Submit
          </LoadingButton>
        </div>
      </form>
    </Modal>
  )
}
