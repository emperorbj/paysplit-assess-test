"use client"

import * as React from "react"
import { ArrowRightIcon, CheckCircle2Icon } from "lucide-react"

import { Field, FIELD } from "@/components/forms/field"
import { PhoneField } from "@/components/forms/phone-field"
import {
  ChangePasswordModal,
  ChangePinModal,
} from "@/components/profile/security-modals"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import { MoneyInput } from "@/components/ui/money-input"
import { NativeSelect } from "@/components/ui/native-select"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useSaveIncome } from "@/hooks/setup/use-setup"
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useUpdateMe,
} from "@/hooks/users/use-profile"
import { splitPhoneNumber } from "@/lib/phone"
import { ordinal } from "@/lib/finance"
import { koboToNaira, nairaToKobo } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { KycCountry } from "@/types/api/kyc"
import type {
  NotificationChannel,
  NotificationTopic,
  Profile,
  UpdateMeDto,
} from "@/types/api/users"

export type ProfileFormValue = {
  firstName: string
  lastName: string
  email: string
  dialCode: string
  phone: string
  employer: string
  salaryCurrency: string
  monthlySalary: number | null
  payday: number
  currency: string
  language: string
  theme: string
}

const CHANNELS = [
  { id: "push", label: "Push Notifications" },
  { id: "sms", label: "SMS Alerts" },
  { id: "email", label: "Email Notifications" },
] as const satisfies readonly { id: NotificationChannel; label: string }[]

/** Form value from GET /users/me/profile. */
export function profileToFormValue(
  profile: Profile,
  countries: KycCountry[]
): ProfileFormValue {
  const { user, income } = profile
  const { dialCode, phone } = splitPhoneNumber(
    user.phoneNumber,
    user.countryCode,
    countries
  )
  return {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    dialCode,
    phone,
    employer: income?.employerName ?? "",
    salaryCurrency: income?.currency ?? "NGN",
    monthlySalary: koboToNaira(income?.monthlyAmount ?? null),
    payday: income?.paydayDay ?? 28,
    // TODO: no preferences endpoint yet; kept locally.
    currency: user.currencyCode ?? "NGN",
    language: "en-US",
    theme: "light",
  }
}

/** Local digits + dial code → +2348031234567 */
function toInternational(dialCode: string, phone: string) {
  const digits = phone.replace(/\D/g, "").replace(/^0+/, "")
  return digits ? `${dialCode}${digits}` : ""
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[20px] border border-line bg-[#F8F8F8]">
      <h2 className="px-6 pt-4 pb-3 text-lg text-ink">{title}</h2>
      <div className="mx-2 mb-2 rounded-[20px] border border-line bg-white p-4">
        {children}
      </div>
    </section>
  )
}

function formatUpdated(date: Date | null) {
  if (!date) return "Never"
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replaceAll("/", ".")
}

/**
 * Settings column. Form edits show a save bar that saves personal details
 * (PATCH /users/me) and salary income (PUT /setup/income); notification
 * toggles save immediately. Preferences, PIN and 2FA are still local.
 */
export function ProfileSettings({
  profile,
  countries,
}: {
  profile: Profile
  /** GET /kyc/countries: dial codes for the phone field */
  countries: KycCountry[]
}) {
  const initialValue = profileToFormValue(profile, countries)
  const [saved, setSaved] = React.useState(initialValue)
  const [value, setValue] = React.useState(initialValue)
  const [justSaved, setJustSaved] = React.useState(false)
  const dirty = JSON.stringify(value) !== JSON.stringify(saved)
  const set = (patch: Partial<ProfileFormValue>) =>
    setValue((v) => ({ ...v, ...patch }))

  const updateMe = useUpdateMe()
  const saveIncome = useSaveIncome()
  const saving = updateMe.isPending || saveIncome.isPending

  const save = async () => {
    const personal: UpdateMeDto = {}
    if (!profile.namesLocked) {
      if (value.firstName.trim() !== saved.firstName)
        personal.firstName = value.firstName.trim()
      if (value.lastName.trim() !== saved.lastName)
        personal.lastName = value.lastName.trim()
    }
    if (value.phone !== saved.phone || value.dialCode !== saved.dialCode) {
      const phoneNumber = toInternational(value.dialCode, value.phone)
      if (phoneNumber) personal.phoneNumber = phoneNumber
    }
    const incomeChanged =
      value.employer !== saved.employer ||
      value.monthlySalary !== saved.monthlySalary ||
      value.payday !== saved.payday

    try {
      if (Object.keys(personal).length > 0) await updateMe.mutateAsync(personal)
      if (incomeChanged && value.employer.trim() && value.monthlySalary)
        await saveIncome.mutateAsync({
          employerName: value.employer.trim(),
          monthlyAmount: nairaToKobo(value.monthlySalary) ?? 0,
          paydayDay: value.payday,
        })
      setSaved(value)
      setJustSaved(true)
    } catch {
      // The hook already toasted the error; keep the edits so the user can retry.
    }
  }

  const [channel, setChannel] = React.useState<NotificationChannel>("email")
  const notifications = useNotificationPreferences()
  const updateNotifications = useUpdateNotificationPreferences()

  const [twoFactor, setTwoFactor] = React.useState(true)
  const lastPassword = profile.security.passwordLastUpdated
  const [passwordUpdated, setPasswordUpdated] = React.useState<Date | null>(
    lastPassword ? new Date(lastPassword) : null
  )
  const [pinUpdated, setPinUpdated] = React.useState<Date | null>(null)
  const [modal, setModal] = React.useState<{
    kind: "password" | "pin" | null
    key: number
  }>({ kind: null, key: 0 })
  const [securityNotice, setSecurityNotice] = React.useState<string | null>(
    null
  )

  React.useEffect(() => {
    if (!justSaved) return
    const id = setTimeout(() => setJustSaved(false), 3000)
    return () => clearTimeout(id)
  }, [justSaved])

  return (
    <>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <Section title="Personal details">
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <Field id="profile-first-name" label="First name">
              <Input
                id="profile-first-name"
                autoComplete="given-name"
                disabled={profile.namesLocked}
                value={value.firstName}
                onChange={(e) => set({ firstName: e.target.value })}
                className={FIELD}
                required
              />
            </Field>
            <Field id="profile-last-name" label="Last name">
              <Input
                id="profile-last-name"
                autoComplete="family-name"
                disabled={profile.namesLocked}
                value={value.lastName}
                onChange={(e) => set({ lastName: e.target.value })}
                className={FIELD}
                required
              />
            </Field>
            <Field id="profile-email" label="Email address">
              <Input
                id="profile-email"
                type="email"
                autoComplete="email"
                value={value.email}
                readOnly
                aria-readonly="true"
                className={cn(FIELD, "bg-muted/50 text-[#667085]")}
              />
            </Field>
            <Field id="profile-phone" label="Phone Number">
              <PhoneField
                id="profile-phone"
                dialCode={value.dialCode}
                phone={value.phone}
                dialCodes={countries.map((c) => c.dialCode)}
                onDialCodeChange={(dialCode) => set({ dialCode })}
                onPhoneChange={(phone) => set({ phone })}
              />
            </Field>
          </div>
          <p className="mt-3 text-sm text-[#667085]">
            {profile.namesLocked
              ? "Your name matches your verified ID and can’t be changed. "
              : ""}
            Contact support to change your email address.
          </p>
        </Section>

        <Section title="Salary Income Source">
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <Field
              id="profile-employer"
              label="Employer"
              className="sm:col-span-2"
            >
              <Input
                id="profile-employer"
                autoComplete="organization"
                value={value.employer}
                onChange={(e) => set({ employer: e.target.value })}
                className={FIELD}
              />
            </Field>
            <Field id="profile-salary" label="Monthly Salary Amount">
              <div className="flex h-15 rounded-[10px] border border-input bg-background shadow-xs transition focus-within:border-brand focus-within:ring-4 focus-within:ring-brand/15 short:h-12">
                <NativeSelect
                  aria-label="Salary currency"
                  value={value.salaryCurrency}
                  onChange={(e) => set({ salaryCurrency: e.target.value })}
                  wrapperClassName="shrink-0 border-r border-input"
                  className="h-full w-[90px] rounded-r-none border-0 pr-8 pl-3 text-ink shadow-none focus-visible:ring-0 short:h-full"
                >
                  <option>NGN</option>
                </NativeSelect>
                <MoneyInput
                  id="profile-salary"
                  value={value.monthlySalary}
                  onValueChange={(monthlySalary) => set({ monthlySalary })}
                  className="h-full rounded-l-none border-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </Field>
            <Field id="profile-payday" label="Expected Payday Day of Month">
              <NativeSelect
                id="profile-payday"
                value={value.payday}
                onChange={(e) => set({ payday: Number(e.target.value) })}
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <option key={day} value={day}>
                    {ordinal(day)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </Section>

        <Section title="Preferences">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="profile-currency" label="Currency">
              <NativeSelect
                id="profile-currency"
                value={value.currency}
                onChange={(e) => set({ currency: e.target.value })}
              >
                <option value="NGN">NGN - Naira</option>
              </NativeSelect>
            </Field>
            <Field id="profile-language" label="Language">
              <NativeSelect
                id="profile-language"
                value={value.language}
                onChange={(e) => set({ language: e.target.value })}
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
              </NativeSelect>
            </Field>
            <Field id="profile-theme" label="Theme">
              <NativeSelect
                id="profile-theme"
                value={value.theme}
                onChange={(e) => set({ theme: e.target.value })}
              >
                <option value="light">Light</option>
                <option value="dark" disabled>
                  Dark (coming soon)
                </option>
              </NativeSelect>
            </Field>
          </div>
        </Section>

        <Section title="Notifications">
          <SegmentedTabs
            label="Notification channel"
            tone="brand"
            options={CHANNELS}
            value={channel}
            onChange={setChannel}
          />
          {notifications.data &&
            !notifications.data.deliveredChannels.includes(channel) && (
              <p className="mt-3 rounded-[10px] bg-brand-50 px-3 py-2 text-sm text-[#344054]">
                We’ll start sending these soon. Your choices are saved for when
                this channel goes live.
              </p>
            )}
          {notifications.isPending ? (
            <ul className="mt-4 space-y-1" aria-label="Loading notifications">
              {Array.from({ length: 4 }, (_, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <Skeleton className="h-6 w-64" />
                  <Skeleton className="h-6 w-11 rounded-full" />
                </li>
              ))}
            </ul>
          ) : notifications.isError ? (
            <div role="alert" className="mt-4 flex items-center gap-3 text-sm">
              <span className="text-[#667085]">
                Couldn’t load your notification settings.
              </span>
              <button
                type="button"
                onClick={() => void notifications.refetch()}
                className="text-brand hover:underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <ul className="mt-4 space-y-1">
              {(
                Object.entries(notifications.data.topics) as [
                  NotificationTopic,
                  string,
                ][]
              ).map(([topic, label]) => {
                const id = `notify-${channel}-${topic}`
                return (
                  <li
                    key={topic}
                    className="flex items-center justify-between gap-4 py-2"
                  >
                    <label htmlFor={id} className="text-base text-ink">
                      {label}
                    </label>
                    <Switch
                      id={id}
                      checked={
                        notifications.data.preferences[channel]?.[topic] ??
                        false
                      }
                      onCheckedChange={(checked) =>
                        updateNotifications.mutate({
                          [channel]: { [topic]: checked },
                        })
                      }
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        <Section title="Security">
          <div className="space-y-5">
            <SecurityRow
              title="Password"
              detail={`Last updated ${formatUpdated(passwordUpdated)}`}
              action={
                <SecurityButton
                  onClick={() =>
                    setModal((m) => ({ kind: "password", key: m.key + 1 }))
                  }
                >
                  Change password
                </SecurityButton>
              }
            />
            <SecurityRow
              title="Transaction PIN"
              detail={`Last updated ${formatUpdated(pinUpdated)}`}
              action={
                <SecurityButton
                  onClick={() =>
                    setModal((m) => ({ kind: "pin", key: m.key + 1 }))
                  }
                >
                  Change PIN
                </SecurityButton>
              }
            />
            <SecurityRow
              title="Two-factor authentication"
              detail="An extra layer of protection with your authenticator app."
              labelFor="profile-2fa"
              action={
                <Switch
                  id="profile-2fa"
                  checked={twoFactor}
                  onCheckedChange={setTwoFactor}
                />
              }
            />
          </div>
          {securityNotice && (
            <p
              role="status"
              className="mt-4 flex items-center gap-1.5 text-sm text-[#12A633]"
            >
              <CheckCircle2Icon className="size-4" />
              {securityNotice}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-sm">
            <span className="text-[#667085]">
              MacBook Pro · Lagos, NG · Current session
            </span>
            {/* TODO: device management screen */}
            <a
              href="#devices"
              className="inline-flex items-center gap-1 text-brand hover:underline"
            >
              Manage devices
              <ArrowRightIcon className="size-3.5" />
            </a>
          </div>
        </Section>

        {/* Save bar: only while there are unsaved form edits. */}
        <div
          className={cn(
            "sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white px-5 py-3 shadow-[0_12px_32px_-12px_rgba(16,24,40,0.25)] transition",
            dirty || justSaved
              ? "opacity-100"
              : "pointer-events-none translate-y-2 opacity-0"
          )}
          aria-hidden={!dirty && !justSaved}
        >
          <p className="text-sm text-[#475467]" role="status">
            {dirty
              ? "You have unsaved changes."
              : justSaved && (
                  <span className="flex items-center gap-1.5 text-[#12A633]">
                    <CheckCircle2Icon className="size-4" />
                    Changes saved
                  </span>
                )}
          </p>
          {dirty && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-10 px-4 text-sm"
                disabled={saving}
                onClick={() => setValue(saved)}
              >
                Discard
              </Button>
              <LoadingButton
                type="submit"
                size="lg"
                className="h-10 px-4 text-sm"
                loading={saving}
              >
                Save changes
              </LoadingButton>
            </div>
          )}
        </div>
      </form>

      {/* Outside the <form>: React bubbles portal events through the tree, so a
          modal submit would otherwise also submit the profile form. */}
      <ChangePasswordModal
        key={`password-${modal.key}`}
        open={modal.kind === "password"}
        onOpenChange={(open) =>
          !open && setModal((m) => ({ ...m, kind: null }))
        }
        onChanged={() => {
          setPasswordUpdated(new Date())
          setSecurityNotice("Password updated.")
          setModal((m) => ({ ...m, kind: null }))
        }}
      />
      <ChangePinModal
        key={`pin-${modal.key}`}
        open={modal.kind === "pin"}
        onOpenChange={(open) =>
          !open && setModal((m) => ({ ...m, kind: null }))
        }
        onChanged={() => {
          setPinUpdated(new Date())
          setSecurityNotice("Transaction PIN updated.")
          setModal((m) => ({ ...m, kind: null }))
        }}
      />
    </>
  )
}

function SecurityRow({
  title,
  detail,
  action,
  labelFor,
}: {
  title: string
  detail: string
  action: React.ReactNode
  labelFor?: string
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        {labelFor ? (
          <label htmlFor={labelFor} className="text-base text-ink">
            {title}
          </label>
        ) : (
          <p className="text-base text-ink">{title}</p>
        )}
        <p className="mt-1 text-sm text-[#667085]">{detail}</p>
      </div>
      {action}
    </div>
  )
}

function SecurityButton({
  onClick,
  children,
}: {
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      onClick={onClick}
      className="h-9 shrink-0 rounded-[10px] border-brand px-3.5 text-sm font-normal text-brand hover:bg-brand-50 hover:text-brand"
    >
      {children}
    </Button>
  )
}
