"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { SearchIcon } from "lucide-react"

import { NotificationsMenu } from "@/components/app-shell/notifications-menu"
import { UserMenu } from "@/components/app-shell/user-menu"
import { Logo } from "@/components/brand/logo"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  // Onboarding (KYC) lives under the Dashboard tab.
  {
    label: "Dashboard",
    href: "/dashboard",
    match: ["/dashboard", "/kyc"],
  },
  { label: "Transactions", href: "/transactions", match: ["/transactions"] },
  { label: "Destination", href: "/destinations", match: ["/destinations"] },
  { label: "Split Rules", href: "/split-rules", match: ["/split-rules"] },
]

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white">
      <div className="relative flex h-[62px] items-center justify-between gap-4 px-4 sm:px-9">
        <Link
          href="/dashboard"
          aria-label="Paysplit dashboard"
          className="text-ink"
        >
          <Logo />
        </Link>

        <nav
          aria-label="Main"
          className="absolute inset-y-0 left-1/2 hidden -translate-x-1/2 md:flex"
        >
          <NavLinks pathname={pathname} />
        </nav>

        <div className="flex items-center gap-3">
          <IconButton label="Search">
            <SearchIcon className="size-5" strokeWidth={1.75} />
          </IconButton>
          <NotificationsMenu />
          <UserMenu />
        </div>
      </div>

      {/* Mobile: nav drops to its own scrollable row */}
      <nav
        aria-label="Main"
        className="flex h-12 overflow-x-auto border-t border-line px-2 md:hidden"
      >
        <NavLinks pathname={pathname} />
      </nav>
    </header>
  )
}

function NavLinks({ pathname }: { pathname: string }) {
  return NAV_ITEMS.map((item) => {
    const active = item.match.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex shrink-0 items-center px-3 text-sm whitespace-nowrap text-ink transition hover:text-brand",
          active &&
            "font-semibold after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-brand"
        )}
      >
        {item.label}
      </Link>
    )
  })
}

function IconButton({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="grid size-10 place-items-center rounded-[10px] border border-line text-ink transition hover:bg-muted"
    >
      {children}
    </button>
  )
}
