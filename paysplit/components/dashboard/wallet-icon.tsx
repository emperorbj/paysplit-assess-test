import {
  ActivityIcon,
  BookOpenIcon,
  HomeIcon,
  LandmarkIcon,
  PiggyBankIcon,
  PlaneIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  UsersIcon,
  UtensilsIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"

// Keyed by category name (GET /categories), with a generic fallback.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Emergency: ActivityIcon,
  Savings: PiggyBankIcon,
  Vacation: PlaneIcon,
  Investment: ShoppingBagIcon,
  "Rent & Housing": HomeIcon,
  "Food & Drinks": UtensilsIcon,
  "Family Support": UsersIcon,
  Family: UsersIcon,
  "Tax & Compliance": LandmarkIcon,
  Education: BookOpenIcon,
  Utilities: ReceiptIcon,
  "Bills & Utilities": ReceiptIcon,
  Other: WalletIcon,
}

/** Solid accent-coloured tile with the wallet category's icon. */
export function WalletTile({
  category,
  color,
  className,
}: {
  /** Category name, e.g. "Savings" */
  category: string
  /** Accent hex from the API, e.g. "#22A447" */
  color: string
  className?: string
}) {
  const Icon = CATEGORY_ICONS[category] ?? WalletIcon
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-lg text-white",
        className
      )}
      style={{ backgroundColor: color }}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </span>
  )
}
