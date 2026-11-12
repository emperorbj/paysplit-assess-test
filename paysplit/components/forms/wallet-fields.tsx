"use client"

import * as React from "react"

import { Field, FIELD } from "@/components/forms/field"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { MoneyInput } from "@/components/ui/money-input"
import { NativeSelect } from "@/components/ui/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { useAccentColors, useCategories } from "@/hooks/wallets/use-wallets"
import { koboToNaira, nairaToKobo } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { CreateWalletDto, Wallet, WalletAccent } from "@/types/api/wallets"

export type WalletFormValue = {
  name: string
  /** id from GET /categories ("" until chosen) */
  categoryId: string
  /** naira (converted to kobo on submit) */
  target: number | null
  noTarget: boolean
  accent: WalletAccent
}

export const EMPTY_WALLET: WalletFormValue = {
  name: "",
  categoryId: "",
  target: null,
  noTarget: false,
  accent: "green",
}

export function isWalletValid(value: WalletFormValue) {
  return (
    value.name.trim() !== "" &&
    value.categoryId !== "" &&
    (value.noTarget || !!value.target)
  )
}

/** Form value → API body (kobo, null target when "No Targeted Amount"). */
export function toWalletDto(value: WalletFormValue): CreateWalletDto {
  return {
    name: value.name.trim(),
    categoryId: value.categoryId,
    accentColor: value.accent,
    targetAmount: value.noTarget ? null : nairaToKobo(value.target),
  }
}

export function walletToFormValue(wallet: Wallet): WalletFormValue {
  return {
    name: wallet.name,
    categoryId: wallet.category.id,
    target: koboToNaira(wallet.targetAmount),
    noTarget: wallet.targetAmount === null,
    accent: wallet.accentColor,
  }
}

const capitalise = (key: string) => key.charAt(0).toUpperCase() + key.slice(1)

/**
 * Name, category, target and accent colour, used by setup and the wallet
 * modal. Categories and colours come from the API.
 */
export function WalletFields({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string
  value: WalletFormValue
  onChange: (value: WalletFormValue) => void
}) {
  const categories = useCategories()
  const accentColors = useAccentColors()
  const set = (patch: Partial<WalletFormValue>) =>
    onChange({ ...value, ...patch })
  const accentHex =
    accentColors.data?.find((c) => c.key === value.accent)?.hex ?? "#22A447"

  return (
    <div className="grid gap-5 sm:grid-cols-2 short:gap-3">
      <Field id={`${idPrefix}-name`} label="Wallet Name" required>
        <Input
          id={`${idPrefix}-name`}
          placeholder="e.g Children school fees"
          maxLength={60}
          value={value.name}
          onChange={(e) => set({ name: e.target.value })}
          className={FIELD}
          required
        />
      </Field>
      <Field id={`${idPrefix}-category`} label="Select Category" required>
        {categories.data ? (
          <NativeSelect
            id={`${idPrefix}-category`}
            value={value.categoryId}
            onChange={(e) => set({ categoryId: e.target.value })}
            className={cn(!value.categoryId && "text-muted-foreground")}
            required
          >
            <option value="" disabled>
              Choose a category
            </option>
            {categories.data.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </NativeSelect>
        ) : (
          <Skeleton className="h-15 w-full rounded-[10px] short:h-12" />
        )}
      </Field>

      <div className="space-y-3 short:space-y-2">
        <Field id={`${idPrefix}-target`} label="Budget Target Amount (₦)">
          <MoneyInput
            id={`${idPrefix}-target`}
            placeholder="e.g ₦1,500,000"
            value={value.noTarget ? null : value.target}
            onValueChange={(target) => set({ target })}
            disabled={value.noTarget}
            className={FIELD}
          />
        </Field>
        <Checkbox
          label="No Targeted Amount"
          checked={value.noTarget}
          onCheckedChange={(noTarget) => set({ noTarget })}
        />
      </div>

      <Field id={`${idPrefix}-accent`} label="Accent Color">
        {accentColors.data ? (
          <div className="relative">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-6 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: accentHex }}
            />
            <NativeSelect
              id={`${idPrefix}-accent`}
              value={value.accent}
              onChange={(e) => set({ accent: e.target.value as WalletAccent })}
              className="pl-12"
            >
              {accentColors.data.map((color) => (
                <option key={color.key} value={color.key}>
                  {capitalise(color.key)}
                </option>
              ))}
            </NativeSelect>
          </div>
        ) : (
          <Skeleton className="h-15 w-full rounded-[10px] short:h-12" />
        )}
      </Field>
    </div>
  )
}
