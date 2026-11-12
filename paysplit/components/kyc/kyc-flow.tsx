"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
} from "lucide-react"

import { IdentityStep } from "@/components/kyc/identity-step"
import { KycSkeleton } from "@/components/kyc/kyc-skeleton"
import { LivenessStep } from "@/components/kyc/liveness-step"
import { ProfileBasicsStep } from "@/components/kyc/profile-basics-step"
import { Button } from "@/components/ui/button"
import {
  Modal,
  ModalDescription,
  ModalDivider,
  ModalTitle,
} from "@/components/ui/modal"
import { SuccessBadge } from "@/components/ui/success-badge"
import { useMe } from "@/hooks/auth/use-auth"
import {
  useKycCountries,
  useKycStatus,
  useSubmitLiveness,
  useUpdateKycProfile,
  useUploadInternationalIdentity,
  useVerifyNigeriaIdentity,
} from "@/hooks/kyc/use-kyc"
import { errorMessage, toApiError } from "@/lib/api/errors"
import { isKycDone } from "@/lib/auth/user"
import { cn } from "@/lib/utils"
import type { KycCountry, KycStatusResponse } from "@/types/api/kyc"

const STEPS = [
  {
    label: "Profile Basics",
    hint: "We’ll use this number for verification and messages about your account.",
  },
  {
    label: "Identity Verification",
    hint: "Your documents are encrypted and only used to confirm your identity.",
  },
  {
    label: "Biometrics Liveness",
    hint: "Your selfie is matched against your ID to keep your account secure.",
  },
] as const

const STEP_INDEX: Record<string, number> = {
  profile: 0,
  identity: 1,
  liveness: 2,
}

// The setup checklist opens as a wizard on top of the dashboard.
const NEXT_ROUTE = "/dashboard?setup=1"

/** Loads countries + KYC status, then renders the flow (skeleton meanwhile). */
export function KycFlow() {
  const countries = useKycCountries()
  const status = useKycStatus()

  if (countries.isPending || status.isPending) return <KycSkeleton />

  if (countries.isError || status.isError) {
    return (
      <div
        role="alert"
        className="mx-2 flex flex-col items-center rounded-[32px] border border-line bg-white px-6 py-20 text-center sm:mx-5"
      >
        <p className="text-lg font-medium text-ink">
          We couldn’t load your verification
        </p>
        <p className="mt-1 text-sm text-[#667085]">
          {errorMessage(countries.error ?? status.error)}
        </p>
        <Button
          size="lg"
          className="mt-5 h-10 px-4 text-sm"
          onClick={() => {
            void countries.refetch()
            void status.refetch()
          }}
        >
          Try again
        </Button>
      </div>
    )
  }

  return <KycFlowLoaded countries={countries.data} status={status.data} />
}

function KycFlowLoaded({
  countries,
  status,
}: {
  countries: KycCountry[]
  status: KycStatusResponse
}) {
  const router = useRouter()
  const { data: me } = useMe()
  const kycApproved = isKycDone(status.kycStatus)

  // Furthest step the backend allows; the user can go back but not past it.
  const serverStep = kycApproved ? 2 : (STEP_INDEX[status.currentStep] ?? 0)
  const [step, setStep] = React.useState(serverStep)
  const [approvedOpen, setApprovedOpen] = React.useState(false)

  const updateProfile = useUpdateKycProfile()
  const verifyNigeria = useVerifyNigeriaIdentity()
  const uploadInternational = useUploadInternationalIdentity()
  const submitLiveness = useSubmitLiveness()

  const profile = status.steps.profile
  const country = countries.find((c) => c.code === profile.countryCode)

  return (
    <>
      <div className="mx-2 rounded-[32px] border border-line bg-white p-2 sm:mx-5 sm:p-[15px] lg:min-h-0 lg:flex-1 short:rounded-3xl short:p-2">
        <div className="grid gap-4 lg:h-full lg:grid-cols-[minmax(0,492px)_minmax(0,1fr)] short:gap-2">
          <StepsPanel
            current={step}
            completedThrough={kycApproved ? 3 : serverStep}
          />

          <section className="flex min-h-0 flex-col rounded-[20px] border border-line bg-[#F8F8F8]">
            <div className="flex h-[54px] shrink-0 items-center justify-between px-5 sm:px-7 short:h-11">
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                disabled={step === 0 || kycApproved}
                className="inline-flex items-center gap-2 text-base text-ink transition hover:text-brand disabled:pointer-events-none disabled:text-[#8C8C8C]"
              >
                <ChevronLeftIcon className="size-5" strokeWidth={1.75} />
                Previous
              </button>
              {/* The backend doesn't allow skipping a KYC step; users can leave and resume later. */}
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="inline-flex items-center gap-2 text-base text-brand transition hover:text-brand/80"
              >
                Skip for now
                <ChevronRightIcon className="size-5" strokeWidth={1.75} />
              </button>
            </div>

            <div className="mx-2 mb-2 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-[20px] border border-line bg-white px-5 py-10 sm:px-12 lg:py-[min(4rem,5svh)] xl:px-[70px] short:py-5">
              {kycApproved ? (
                <KycComplete onContinue={() => router.push(NEXT_ROUTE)} />
              ) : (
                <>
                  {step === 0 && (
                    <ProfileBasicsStep
                      countries={countries}
                      defaultValue={{
                        countryCode:
                          profile.countryCode ?? me?.user.countryCode ?? "NG",
                        phoneNumber:
                          profile.phoneNumber ?? me?.user.phoneNumber ?? "",
                      }}
                      pending={updateProfile.isPending}
                      onSubmit={(dto) =>
                        updateProfile.mutate(dto, {
                          onSuccess: () => setStep(1),
                        })
                      }
                    />
                  )}
                  {step === 1 && (
                    <IdentityStep
                      // Remount when the country changes so region/method reset.
                      key={profile.countryCode ?? "none"}
                      country={country}
                      identity={status.steps.identity}
                      pending={
                        verifyNigeria.isPending || uploadInternational.isPending
                      }
                      onSubmitNigeria={(dto) =>
                        verifyNigeria.mutate(dto, {
                          onSuccess: () => setStep(2),
                        })
                      }
                      onSubmitInternational={(dto) =>
                        uploadInternational.mutate(dto, {
                          onSuccess: () => setStep(2),
                        })
                      }
                      onContinue={() => setStep(2)}
                    />
                  )}
                  {step === 2 && (
                    <LivenessStep
                      liveness={status.steps.liveness}
                      pending={submitLiveness.isPending}
                      onCapture={(selfie) =>
                        submitLiveness.mutate(selfie, {
                          onSuccess: () => setApprovedOpen(true),
                          // 409: the identity step isn't done yet.
                          onError: (error) => {
                            if (toApiError(error).status === 409) setStep(1)
                          },
                        })
                      }
                    />
                  )}
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <Modal
        open={approvedOpen}
        onOpenChange={setApprovedOpen}
        className="max-w-[415px]"
        showClose={false}
      >
        <SuccessBadge className="pt-14 pb-12" />
        <div className="px-6 text-center">
          <ModalTitle className="text-2xl tracking-tight text-ink">
            Identity Approved
          </ModalTitle>
          <ModalDescription className="mt-2 text-base text-[#6B6B6B]">
            Your {identityLabel(status)} and liveness check have been
            authenticated by the provider.
          </ModalDescription>
        </div>
        <ModalDivider />
        <div className="px-6 pb-6">
          <Button
            size="xl"
            className="w-full"
            onClick={() => router.push(NEXT_ROUTE)}
          >
            Continue to Setup Checklist
          </Button>
        </div>
      </Modal>
    </>
  )
}

function identityLabel(status: KycStatusResponse) {
  const method = status.steps.identity.method
  if (method === "bvn" || method === "nin") return method.toUpperCase()
  return "ID document"
}

function KycComplete({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <SuccessBadge className="scale-75" />
      <h2 className="mt-2 text-2xl font-medium tracking-tight text-ink">
        You’re verified
      </h2>
      <p className="mt-1 max-w-sm text-base text-[#475467]">
        Your identity has been approved. Set up your salary partitions next.
      </p>
      <Button size="xl" className="mt-8 w-full max-w-sm" onClick={onContinue}>
        Continue to Setup Checklist
      </Button>
    </div>
  )
}

function StepsPanel({
  current,
  completedThrough,
}: {
  current: number
  /** Steps before this index are done on the backend. */
  completedThrough: number
}) {
  const hint = STEPS[Math.min(current, STEPS.length - 1)].hint
  return (
    <aside className="flex flex-col items-center overflow-hidden rounded-[20px] bg-linear-to-b from-[#E8F5FF] via-[#F3F9FF] to-white px-6 py-6 text-center lg:min-h-0">
      <Image
        src="/images/kyc/id-card.png"
        alt=""
        width={144}
        height={144}
        loading="eager"
        className="hidden size-[min(9rem,14svh)] lg:block"
      />

      <ol className="flex w-full justify-around gap-2 lg:mt-[min(3.5rem,5svh)] lg:flex-col lg:items-center lg:gap-[min(22px,2.5svh)]">
        {STEPS.map((item, index) => {
          const status =
            index === current
              ? "active"
              : index < completedThrough
                ? "complete"
                : "pending"
          return (
            <li
              key={item.label}
              aria-current={index === current ? "step" : undefined}
              className="flex flex-col items-center gap-2"
            >
              <StepIcon status={status} />
              <span
                className={cn(
                  "text-sm sm:text-base lg:text-xl",
                  status === "active" && "text-brand",
                  status === "complete" && "text-[#6B6B6B]",
                  status === "pending" && "text-[#8C8C8C]"
                )}
              >
                {item.label}
              </span>
            </li>
          )
        })}
      </ol>

      <p className="mt-6 max-w-[320px] text-sm text-ink sm:text-base lg:mt-[min(58px,5svh)]">
        {hint}
      </p>
    </aside>
  )
}

function StepIcon({ status }: { status: "complete" | "active" | "pending" }) {
  if (status === "pending") {
    return (
      <CircleCheckIcon className="size-6 text-[#8C8C8C]" strokeWidth={1.25} />
    )
  }
  return (
    <span
      className={cn(
        "grid size-6 place-items-center rounded-full text-white",
        status === "active" ? "bg-brand" : "bg-ink"
      )}
    >
      <CheckIcon className="size-3.5" strokeWidth={2.5} />
    </span>
  )
}
