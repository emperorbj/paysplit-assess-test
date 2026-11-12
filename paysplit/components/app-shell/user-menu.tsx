"use client"

import * as React from "react"
import { Popover } from "@base-ui/react/popover"

import { AccountCard, SignOutDialog } from "@/components/app-shell/account-card"
import { UserAvatar } from "@/components/app-shell/user-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useMe } from "@/hooks/auth/use-auth"

/** User pill in the header that opens the account popover. */
export function UserMenu() {
  const [open, setOpen] = React.useState(false)
  const [signingOut, setSigningOut] = React.useState(false)
  const { data } = useMe()
  const user = data?.user

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          disabled={!user}
          aria-label={
            user ? `Account menu for ${user.firstName}` : "Loading account"
          }
          className="flex h-10 items-center gap-2 rounded-[10px] border border-line px-3 text-sm text-ink transition hover:bg-muted data-popup-open:bg-muted"
        >
          {user ? (
            <>
              <UserAvatar user={user} className="size-6 text-[10px]" />
              {user.firstName}
            </>
          ) : (
            <>
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-4 w-12" />
            </>
          )}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            side="bottom"
            align="end"
            sideOffset={8}
            className="z-50"
          >
            <Popover.Popup
              aria-label="Account"
              className="w-[min(380px,calc(100vw-2rem))] origin-(--transform-origin) rounded-2xl bg-white text-ink shadow-[0_20px_40px_-12px_rgba(16,24,40,0.22)] transition-[opacity,scale] duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0"
            >
              <AccountCard
                onClose={() => setOpen(false)}
                onSignOut={() => {
                  setOpen(false)
                  setSigningOut(true)
                }}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <SignOutDialog open={signingOut} onOpenChange={setSigningOut} />
    </>
  )
}
