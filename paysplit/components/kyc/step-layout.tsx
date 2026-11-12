import * as React from "react"

import { LoadingButton } from "@/components/ui/loading-button"

/** Shared body for each KYC step: title, description, fields, and a bottom-pinned action. */
export function KycStepForm({
  title,
  description,
  children,
  submitLabel,
  submitDisabled,
  pending,
  onSubmit,
}: {
  title: string
  description: string
  children: React.ReactNode
  submitLabel: string
  submitDisabled?: boolean
  /** Mutation in flight: spinner on the action button. */
  pending?: boolean
  onSubmit: () => void
}) {
  return (
    <form
      className="flex flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <h2 className="text-2xl font-medium tracking-tight text-ink sm:text-[28px] short:text-2xl">
        {title}
      </h2>
      <p className="mt-1 text-base text-[#475467] sm:text-lg short:text-base">
        {description}
      </p>

      <div className="mt-6 mb-6 flex min-h-0 flex-1 flex-col lg:mt-[min(2.75rem,4svh)] short:mt-4 short:mb-4">
        {children}
      </div>

      <LoadingButton
        type="submit"
        size="xl"
        disabled={submitDisabled}
        loading={pending}
        className="w-full shrink-0"
      >
        {submitLabel}
      </LoadingButton>
    </form>
  )
}
