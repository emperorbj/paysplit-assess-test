import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

// Mirrors the backend rule: min 8 chars with upper, lower, digit and special.
export const PASSWORD_RULES = [
  { id: "length", label: "8+ characters", test: (p: string) => p.length >= 8 },
  {
    id: "upper",
    label: "Uppercase letter",
    test: (p: string) => /[A-Z]/.test(p),
  },
  {
    id: "lower",
    label: "Lowercase letter",
    test: (p: string) => /[a-z]/.test(p),
  },
  { id: "digit", label: "A number", test: (p: string) => /\d/.test(p) },
  {
    id: "special",
    label: "A symbol",
    test: (p: string) => /[^A-Za-z0-9]/.test(p),
  },
] as const

export function isStrongPassword(password: string) {
  return PASSWORD_RULES.every((rule) => rule.test(password))
}

export function PasswordRequirements({
  password,
  className,
}: {
  password: string
  className?: string
}) {
  return (
    <ul
      aria-label="Password requirements"
      className={cn("flex flex-wrap gap-x-4 gap-y-1.5 text-xs", className)}
    >
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li
            key={rule.id}
            className={cn(
              "flex items-center gap-1.5",
              met ? "text-[#12A633]" : "text-[#667085]"
            )}
          >
            <CheckIcon
              className={cn("size-3.5", !met && "opacity-30")}
              strokeWidth={3}
              aria-hidden="true"
            />
            {rule.label}
            <span className="sr-only">{met ? "(met)" : "(not met)"}</span>
          </li>
        )
      })}
    </ul>
  )
}
