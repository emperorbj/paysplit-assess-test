import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** Small search field used in table/panel headers. */
export function SearchInput({
  value,
  onChange,
  label,
  className,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
}) {
  return (
    <label className={cn("relative", className)}>
      <span className="sr-only">{label}</span>
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-[#667085]"
        strokeWidth={1.5}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search"
        className="h-10 w-36 rounded-[10px] border border-line bg-white pr-3 pl-10 text-sm text-ink outline-none placeholder:text-[#667085] focus-visible:border-brand focus-visible:ring-4 focus-visible:ring-brand/15"
      />
    </label>
  )
}
