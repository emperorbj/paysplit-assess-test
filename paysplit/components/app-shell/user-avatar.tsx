import Image from "next/image"

import { initials } from "@/lib/auth/user"
import { cn } from "@/lib/utils"
import type { User } from "@/types/api/auth"

/** Profile photo when the user has uploaded one, otherwise their initials. */
export function UserAvatar({
  user,
  className,
}: {
  user: Pick<User, "firstName" | "lastName" | "profileImageUrl">
  className?: string
}) {
  if (user.profileImageUrl) {
    return (
      <Image
        src={user.profileImageUrl}
        alt=""
        width={80}
        height={80}
        // Remote storage URL; skip the optimiser so no remotePatterns are needed.
        unoptimized
        className={cn("size-10 shrink-0 rounded-full object-cover", className)}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full bg-brand-50 font-medium text-brand",
        className
      )}
    >
      {initials(user)}
    </span>
  )
}
