"use client"

import { NativeSelect } from "@/components/ui/native-select"
import { cn } from "@/lib/utils"

/** Dial-code select + phone number in one bordered control. */
export function PhoneField({
  id,
  dialCode,
  phone,
  onDialCodeChange,
  onPhoneChange,
  placeholder = "803 456 7890",
  required,
  dialCodes,
  className,
}: {
  id: string
  dialCode: string
  phone: string
  onDialCodeChange: (dialCode: string) => void
  onPhoneChange: (phone: string) => void
  placeholder?: string
  required?: boolean
  /** Dial codes to offer, from GET /kyc/countries. */
  dialCodes: string[]
  className?: string
}) {
  // De-duplicated (+1 is shared), always including the current value.
  const options = [...new Set([...(dialCode ? [dialCode] : []), ...dialCodes])]

  return (
    <div
      className={cn(
        "flex h-15 rounded-[10px] border border-input bg-background shadow-xs transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15 short:h-12",
        className
      )}
    >
      <NativeSelect
        aria-label="Country code"
        value={dialCode}
        onChange={(event) => onDialCodeChange(event.target.value)}
        wrapperClassName="shrink-0 border-r border-input"
        className="h-full w-[90px] rounded-r-none border-0 pr-8 pl-3 shadow-none focus-visible:ring-0 short:h-full"
      >
        {options.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </NativeSelect>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        placeholder={placeholder}
        value={phone}
        onChange={(event) => onPhoneChange(event.target.value)}
        className="min-w-0 flex-1 rounded-r-[10px] bg-transparent px-3 text-base text-ink outline-none placeholder:text-muted-foreground"
        required={required}
      />
    </div>
  )
}
