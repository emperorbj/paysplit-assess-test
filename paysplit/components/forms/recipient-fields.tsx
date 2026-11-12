"use client"

import * as React from "react"
import { CheckCircle2Icon, Loader2Icon } from "lucide-react"

import { Field, FIELD } from "@/components/forms/field"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import {
  NIGERIAN_BANKS,
  resolveAccountName,
  WALLET_CATEGORIES,
  type WalletCategory,
} from "@/lib/finance"
import { cn } from "@/lib/utils"

export type RecipientFormValue = {
  bank: string
  accountNumber: string
  /** Filled by the name lookup; empty until the account is verified. */
  accountName: string
  category: WalletCategory
  narration: string
}

export const EMPTY_RECIPIENT: RecipientFormValue = {
  bank: "",
  accountNumber: "",
  accountName: "",
  category: "Emergency",
  narration: "",
}

/** A recipient can be saved once its account name has been resolved. */
export function isRecipientValid(value: RecipientFormValue) {
  return value.accountName !== ""
}

type Lookup = "idle" | "loading" | "found" | "failed"

/**
 * Bank, account number (with live account-name lookup), category and
 * narration. Used by setup and the beneficiary modal.
 */
export function RecipientFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string
  value: RecipientFormValue
  onChange: (value: RecipientFormValue) => void
}) {
  const [lookup, setLookup] = React.useState<Lookup>(
    value.accountName ? "found" : "idle"
  )
  // Keep the latest value/callback for the async lookup result.
  const valueRef = React.useRef(value)
  const onChangeRef = React.useRef(onChange)
  React.useEffect(() => {
    valueRef.current = value
    onChangeRef.current = onChange
  })

  const { bank, accountNumber, accountName } = value
  React.useEffect(() => {
    if (!bank || accountNumber.length !== 10 || accountName) return
    let cancelled = false
    // Network lookup is an external system; flag it as in progress.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLookup("loading")
    resolveAccountName(bank, accountNumber).then((name) => {
      if (cancelled) return
      onChangeRef.current({ ...valueRef.current, accountName: name ?? "" })
      setLookup(name ? "found" : "failed")
    })
    return () => {
      cancelled = true
    }
  }, [bank, accountNumber, accountName])

  // Any change to bank/number invalidates the resolved name.
  const setAccount = (patch: Partial<RecipientFormValue>) => {
    setLookup("idle")
    onChange({ ...value, ...patch, accountName: "" })
  }

  return (
    <div className="space-y-5 short:space-y-3">
      <Field id={`${idPrefix}-bank`} label="Bank Name" required>
        <NativeSelect
          id={`${idPrefix}-bank`}
          value={value.bank}
          onChange={(e) => setAccount({ bank: e.target.value })}
          className={cn(!value.bank && "text-muted-foreground")}
          required
        >
          <option value="" disabled>
            e.g Access bank
          </option>
          {NIGERIAN_BANKS.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </NativeSelect>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2 short:gap-3">
        <Field id={`${idPrefix}-account`} label="Account Number (10 Digits)">
          <Input
            id={`${idPrefix}-account`}
            inputMode="numeric"
            maxLength={10}
            placeholder="e.g 1234567898"
            value={value.accountNumber}
            onChange={(e) =>
              setAccount({ accountNumber: e.target.value.replace(/\D/g, "") })
            }
            className={FIELD}
            aria-describedby={`${idPrefix}-account-status`}
            required
          />
          <p
            id={`${idPrefix}-account-status`}
            aria-live="polite"
            className="flex min-h-5 items-center gap-1.5 text-base"
          >
            {lookup === "loading" && (
              <span className="flex items-center gap-1.5 text-sm text-[#667085]">
                <Loader2Icon className="size-4 animate-spin" />
                Verifying account…
              </span>
            )}
            {lookup === "found" && value.accountName && (
              <span className="flex items-center gap-1.5 text-[#12A633]">
                {value.accountName}
                <CheckCircle2Icon
                  className="size-5 fill-[#12A633] text-white"
                  strokeWidth={2}
                />
              </span>
            )}
            {lookup === "failed" && (
              <span className="text-sm text-destructive">
                We couldn’t verify this account.
              </span>
            )}
          </p>
        </Field>
        <Field id={`${idPrefix}-category`} label="Select Category">
          <NativeSelect
            id={`${idPrefix}-category`}
            value={value.category}
            onChange={(e) =>
              onChange({ ...value, category: e.target.value as WalletCategory })
            }
          >
            {WALLET_CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Field
        id={`${idPrefix}-narration`}
        label="Payment Narration / Reference Note (optional)"
      >
        <Input
          id={`${idPrefix}-narration`}
          placeholder="e.g., payment for rent"
          value={value.narration}
          onChange={(e) => onChange({ ...value, narration: e.target.value })}
          className={FIELD}
        />
      </Field>
    </div>
  )
}
