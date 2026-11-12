"use client"

import * as React from "react"

import {
  isRuleValid,
  RuleFields,
  type DestinationOption,
  type RuleDestinationType,
  type RuleFormValue,
} from "@/components/forms/rule-fields"
import { LoadingButton } from "@/components/ui/loading-button"
import { Modal, ModalDivider } from "@/components/ui/modal"
import { TexturedModalHeader } from "@/components/ui/textured-header"

export function RuleFormModal({
  open,
  onOpenChange,
  mode,
  initialValue,
  walletOptions,
  beneficiaryOptions,
  salary,
  available,
  onSave,
  pending = false,
  emptyHint,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValue: RuleFormValue
  walletOptions: DestinationOption[]
  beneficiaryOptions: DestinationOption[]
  salary: number
  /** Salary left unallocated by the *other* rules. */
  available: number
  onSave: (value: RuleFormValue) => void
  pending?: boolean
  emptyHint?: Record<RuleDestinationType, string>
}) {
  const [draft, setValue] = React.useState(initialValue)
  // Destinations can load after the modal opens (deep links): default to the first.
  const options =
    draft.destination === "wallet" ? walletOptions : beneficiaryOptions
  const value =
    draft.targetId === "" && options.length > 0
      ? { ...draft, targetId: options[0].id }
      : draft

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      className="flex max-h-[min(800px,calc(100svh-6rem))] max-w-[678px] flex-col"
    >
      <TexturedModalHeader
        title={mode === "create" ? "Create Split Rule" : "Edit Split Rule"}
        description="Configure automatic distribution of incoming funds on every payday."
      />
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(event) => {
          event.preventDefault()
          onSave(value)
        }}
      >
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-6 pb-6">
          <RuleFields
            idPrefix="rule-form"
            value={value}
            onChange={setValue}
            walletOptions={walletOptions}
            beneficiaryOptions={beneficiaryOptions}
            emptyHint={emptyHint}
            salary={salary}
            available={available}
          />
        </div>
        <ModalDivider className="mt-0 mb-6 shrink-0" />
        <div className="shrink-0 px-6 pb-6">
          <LoadingButton
            type="submit"
            size="xl"
            disabled={!isRuleValid(value)}
            loading={pending}
            className="w-full"
          >
            {mode === "create" ? "Activate Split Rule" : "Save Changes"}
          </LoadingButton>
        </div>
      </form>
    </Modal>
  )
}
