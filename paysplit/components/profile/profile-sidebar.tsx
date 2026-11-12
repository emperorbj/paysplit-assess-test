"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"

import { Panel, PanelLink } from "@/components/dashboard/panel"
import { WalletsPanel } from "@/components/dashboard/wallets-panel"
import { AccountDetails } from "@/components/ui/account-details"
import { CopyButton } from "@/components/ui/copy-button"
import { LoadingButton } from "@/components/ui/loading-button"
import { UserAvatar } from "@/components/app-shell/user-avatar"
import {
  useRemoveProfileImage,
  useUploadProfileImage,
} from "@/hooks/users/use-profile"
import { useWallets } from "@/hooks/wallets/use-wallets"
import { fullName, isKycDone } from "@/lib/auth/user"
import type { Profile } from "@/types/api/users"

const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"]

export function ProfileSidebar({ profile }: { profile: Profile }) {
  const { user, salaryAccount } = profile
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [photoError, setPhotoError] = React.useState<string | null>(null)
  const upload = useUploadProfileImage()
  const removePhoto = useRemoveProfileImage()
  const wallets = useWallets()

  const memberSince = new Date(profile.memberSince).toLocaleDateString(
    "en-US",
    { month: "long", year: "numeric", timeZone: "UTC" }
  )

  return (
    <aside className="space-y-4">
      <section className="rounded-[20px] bg-linear-to-b from-brand-50 to-white p-5">
        <div className="flex items-center gap-4">
          <UserAvatar
            user={user}
            className="size-20 text-2xl ring-4 ring-white"
          />
          <div className="min-w-0">
            <h2 className="truncate text-[28px] leading-tight text-ink">
              {fullName(user)}
            </h2>
            <p className="mt-1 text-sm text-[#667085]">Tier {profile.tier}</p>
          </div>
        </div>

        <dl className="mt-5 space-y-3 border-t border-line pt-5 text-sm">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[#667085]">Account ID:</dt>
            <dd className="flex items-center gap-1 text-base text-ink">
              {profile.accountId}
              <CopyButton
                value={profile.accountId}
                label="Copy account ID"
                className="text-ink"
              />
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-[#667085]">Member since:</dt>
            <dd className="text-base text-ink">{memberSince}</dd>
          </div>
        </dl>

        <div className="mt-5 flex gap-2">
          <LoadingButton
            variant="outline"
            size="lg"
            className="h-11 flex-1 border-brand text-sm text-brand hover:bg-brand-50 hover:text-brand"
            loading={upload.isPending}
            disabled={removePhoto.isPending}
            onClick={() => fileRef.current?.click()}
          >
            {user.profileImageUrl
              ? "Change profile photo"
              : "Upload profile photo"}
          </LoadingButton>
          {user.profileImageUrl && (
            <LoadingButton
              variant="ghost"
              size="lg"
              className="h-11 px-3 text-sm font-normal text-[#D92D20] hover:bg-danger-50 hover:text-[#D92D20]"
              loading={removePhoto.isPending}
              disabled={upload.isPending}
              onClick={() => removePhoto.mutate()}
            >
              Remove
            </LoadingButton>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={PHOTO_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-label="Upload profile photo"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (!file) return
            if (!PHOTO_TYPES.includes(file.type)) {
              setPhotoError("Please choose a PNG, JPG or WebP image.")
            } else if (file.size > MAX_PHOTO_BYTES) {
              setPhotoError("That image is larger than 5MB.")
            } else {
              setPhotoError(null)
              upload.mutate(file)
            }
          }}
        />
        {photoError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {photoError}
          </p>
        )}
      </section>

      <Panel
        title="Account Details"
        action={
          <PanelLink
            href="/transactions"
            label="Account statement"
            showLabel={false}
          />
        }
      >
        {salaryAccount.accountNumber ? (
          <AccountDetails
            className="mx-2 mb-2"
            accountNumber={salaryAccount.accountNumber}
            rows={[
              { label: "Account Name", value: salaryAccount.accountName },
              { label: "Bank Name", value: salaryAccount.bankName ?? "—" },
            ]}
          />
        ) : (
          <div className="mx-2 mb-2 rounded-[20px] border border-line bg-white p-4 text-sm text-[#475467]">
            {isKycDone(user.kycStatus) ? (
              "Your dedicated PaySplit account number is being issued. Check back shortly."
            ) : (
              <>
                Your dedicated PaySplit account number is issued once your
                identity is verified.{" "}
                <Link
                  href="/kyc"
                  className="font-medium text-brand hover:underline"
                >
                  Complete KYC →
                </Link>
              </>
            )}
          </div>
        )}
      </Panel>

      <WalletsPanel
        wallets={wallets.data ?? []}
        loading={wallets.isPending}
        limit={3}
        showChevron
      />

      <Panel title="Here to help">
        <div className="mx-2 mb-2 rounded-[20px] border border-line bg-white p-4">
          <p className="text-sm text-[#667085]">
            Questions about your account? Our support team is available around
            the clock.
          </p>
          {/* TODO: point at the real support channel. */}
          <a
            href="#contact-support"
            className="mt-4 inline-flex items-center gap-1 text-sm text-brand hover:underline"
          >
            Contact support
            <ArrowRightIcon className="size-3.5" />
          </a>
        </div>
      </Panel>
    </aside>
  )
}
