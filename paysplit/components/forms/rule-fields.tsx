"use client"

import * as React from "react"
import { AlertTriangleIcon } from "lucide-react"

import { Field, FIELD } from "@/components/forms/field"
import { PeopleIcon, WalletIcon } from "@/components/icons/vuesax"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import { NativeSelect } from "@/components/ui/native-select"
import { RadioCard } from "@/components/ui/radio-card"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { formatNaira } from "@/lib/finance"
import { koboToNaira, nairaToKobo } from "@/lib/money"
import { monthlyAllocation } from "@/lib/rules"
import { cn } from "@/lib/utils"
import type { CreateSplitRuleDto, SplitRule } from "@/types/api/split-rules"

export type RuleDestinationType = "wallet" | "beneficiary"

export type RuleFormValue = {
  name: string
  priority: number
  destination: RuleDestinationType
  /** id of the selected wallet / beneficiary ("" when none) */
  targetId: string
  method: "fixed" | "percentage"
  value: number | null
}

export type DestinationOption = { id: string; label: string }

export function emptyRule(
  destination: RuleDestinationType = "wallet",
  targetId = ""
): RuleFormValue {
  return {
    name: "",
    priority: 10,
    destination,
    targetId,
    method: "fixed",
    value: null,
  }
}

export function isRuleValid(value: RuleFormValue) {
  const amountValid =
    value.method === "fixed"
      ? !!value.value
      : value.value !== null && value.value > 0 && value.value <= 100
  return value.name.trim() !== "" && value.targetId !== "" && amountValid
}

/** Form value → API body (fixed amounts in kobo, percentages as-is). */
export function toRuleDto(value: RuleFormValue): CreateSplitRuleDto {
  return {
    name: value.name.trim(),
    priority: value.priority,
    destinationType: value.destination,
    ...(value.destination === "wallet"
      ? { walletId: value.targetId }
      : { beneficiaryId: value.targetId }),
    method: value.method,
    value:
      value.method === "fixed"
        ? (nairaToKobo(value.value) ?? 0)
        : (value.value ?? 0),
  }
}

export function ruleToFormValue(rule: SplitRule): RuleFormValue {
  return {
    name: rule.name,
    priority: rule.priority,
    destination: rule.destinationType,
    targetId: rule.destination.id,
    method: rule.method,
    value: rule.method === "fixed" ? koboToNaira(rule.value) : rule.value,
  }
}

/** 1–20, plus the current value if a rule was saved with a higher one (API allows 1–100). */
function priorityOptions(current: number) {
  const options = Array.from({ length: 20 }, (_, i) => i + 1)
  return current > 20 ? [...options, current] : options
}

/**
 * Rule name, priority, destination (wallet / beneficiary), target and
 * allocation. Used by the setup wizard and the Split Rules modal.
 */
export function RuleFields({
  idPrefix,
  value,
  onChange,
  walletOptions,
  beneficiaryOptions,
  emptyHint = {
    wallet: "No wallet yet — create one first",
    beneficiary: "No beneficiary yet — add one first",
  },
  salary,
  available,
}: {
  idPrefix: string
  value: RuleFormValue
  onChange: (value: RuleFormValue) => void
  walletOptions: DestinationOption[]
  beneficiaryOptions: DestinationOption[]
  emptyHint?: Record<RuleDestinationType, string>
  /** Monthly salary, to preview what the rule takes each payday. */
  salary?: number
  /** Salary not yet claimed by other rules, to warn about over-allocation. */
  available?: number
}) {
  const set = (patch: Partial<RuleFormValue>) =>
    onChange({ ...value, ...patch })
  const options =
    value.destination === "wallet" ? walletOptions : beneficiaryOptions

  const chooseDestination = (destination: RuleDestinationType) => {
    const list = destination === "wallet" ? walletOptions : beneficiaryOptions
    set({ destination, targetId: list[0]?.id ?? "" })
  }

  const monthly = salary ? monthlyAllocation(value, salary) : 0
  const overAllocated =
    available !== undefined && monthly > 0 && monthly > available

  return (
    <div className="space-y-4 short:space-y-3">
      <div className="grid gap-5 sm:grid-cols-2 short:gap-3">
        <Field id={`${idPrefix}-name`} label="Rule Name" required>
          <Input
            id={`${idPrefix}-name`}
            placeholder="e.g Payment for gbese"
            value={value.name}
            onChange={(e) => set({ name: e.target.value })}
            className={FIELD}
            required
          />
        </Field>
        <Field id={`${idPrefix}-priority`} label="Priority">
          <NativeSelect
            id={`${idPrefix}-priority`}
            value={value.priority}
            onChange={(e) => set({ priority: Number(e.target.value) })}
            aria-describedby={`${idPrefix}-priority-hint`}
          >
            {priorityOptions(value.priority).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </NativeSelect>
          <span id={`${idPrefix}-priority-hint`} className="sr-only">
            Rules with priority 1 run first on payday.
          </span>
        </Field>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-[#344054]">
          Destination Type <span aria-hidden="true">*</span>
        </p>
        <div
          role="radiogroup"
          aria-label="Destination type"
          className="grid gap-3 sm:grid-cols-2"
        >
          <RadioCard
            checked={value.destination === "wallet"}
            onSelect={() => chooseDestination("wallet")}
            icon={<WalletIcon className="size-5 text-ink" />}
            title="Move to Wallet"
            description="Internal budget, savings account"
          />
          <RadioCard
            checked={value.destination === "beneficiary"}
            onSelect={() => chooseDestination("beneficiary")}
            icon={<PeopleIcon className="size-5 text-[#737373]" />}
            title="Send to Beneficiary"
            description="External bank payout"
          />
        </div>
      </div>

      <Field
        id={`${idPrefix}-target`}
        label={
          value.destination === "wallet"
            ? "Select Wallet"
            : "Select Beneficiary"
        }
        required
      >
        <NativeSelect
          id={`${idPrefix}-target`}
          value={value.targetId}
          onChange={(e) => set({ targetId: e.target.value })}
          disabled={options.length === 0}
          className={cn(options.length === 0 && "text-muted-foreground")}
          required
        >
          {options.length === 0 ? (
            <option value="">{emptyHint[value.destination]}</option>
          ) : (
            options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))
          )}
        </NativeSelect>
      </Field>

      <div className="space-y-2">
        <p className="text-sm font-medium text-[#344054]">
          Allocation Method &amp; Value <span aria-hidden="true">*</span>
        </p>
        <SegmentedTabs
          label="Allocation method"
          options={[
            { id: "fixed", label: "Fix Amount (₦)" },
            { id: "percentage", label: "Percentage (%)" },
          ]}
          value={value.method}
          onChange={(method) => set({ method, value: null })}
        />
        {value.method === "fixed" ? (
          <MoneyInput
            aria-label="Amount"
            aria-describedby={`${idPrefix}-allocation-hint`}
            placeholder="e.g ₦30,000"
            value={value.value}
            onValueChange={(amount) => set({ value: amount })}
            className={FIELD}
          />
        ) : (
          <div className="relative">
            <Input
              aria-label="Percentage of salary"
              aria-describedby={`${idPrefix}-allocation-hint`}
              inputMode="numeric"
              maxLength={3}
              placeholder="e.g 15"
              value={value.value ?? ""}
              onChange={(e) => {
                const raw = e.target.value.replace(/\D/g, "")
                set({ value: raw === "" ? null : Math.min(100, Number(raw)) })
              }}
              className={cn(FIELD, "pr-10")}
            />
            <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-[#667085]">
              %
            </span>
          </div>
        )}
        {salary !== undefined && monthly > 0 && (
          <p
            id={`${idPrefix}-allocation-hint`}
            aria-live="polite"
            className={cn(
              "flex items-start gap-1.5 text-sm",
              overAllocated ? "text-[#B54708]" : "text-[#667085]"
            )}
          >
            {overAllocated && (
              <AlertTriangleIcon
                className="mt-0.5 size-4 shrink-0"
                strokeWidth={1.75}
              />
            )}
            {overAllocated
              ? `This rule takes ${formatNaira(monthly)} but only ${formatNaira(available ?? 0)} of your salary is unallocated. Lower-priority rules may not run in full.`
              : value.method === "percentage"
                ? `≈ ${formatNaira(monthly)} every payday (of ${formatNaira(salary)}).`
                : `${Math.round((monthly / salary) * 1000) / 10}% of your ${formatNaira(salary)} salary.`}
          </p>
        )}
      </div>
    </div>
  )
}
