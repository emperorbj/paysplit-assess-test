"use client"

import * as React from "react"
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  FileIcon,
  UploadCloudIcon,
  XIcon,
} from "lucide-react"

import { KycStepForm } from "@/components/kyc/step-layout"
import { Button } from "@/components/ui/button"
import { Input, Label } from "@/components/ui/input"
import { RadioCard } from "@/components/ui/radio-card"
import { SegmentedTabs } from "@/components/ui/segmented-tabs"
import { isKycDone } from "@/lib/auth/user"
import { cn } from "@/lib/utils"
import type {
  InternationalDocumentType,
  InternationalIdentityDto,
  KycCountry,
  KycRegion,
  KycStatusResponse,
  NigeriaIdentityDto,
  NigeriaIdMethod,
} from "@/types/api/kyc"

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024
const ACCEPTED_TYPES = ["image/png", "image/jpeg"]

const NIGERIA_ID_TYPES = [
  { id: "bvn", label: "BVN", name: "Bank Verification Number" },
  { id: "nin", label: "NIN", name: "National Identification Number" },
] as const

const INTERNATIONAL_METHODS = [
  { id: "passport", label: "Passport" },
  { id: "drivers_license", label: "Driver’s License" },
] as const

type IdentityStatus = KycStatusResponse["steps"]["identity"]

export function IdentityStep({
  country,
  identity,
  pending,
  onSubmitNigeria,
  onSubmitInternational,
  onContinue,
}: {
  /** The country chosen in Profile Basics (decides region + allowed methods). */
  country: KycCountry | undefined
  identity: IdentityStatus
  pending: boolean
  onSubmitNigeria: (dto: NigeriaIdentityDto) => void
  onSubmitInternational: (dto: InternationalIdentityDto) => void
  /** Identity already verified: go to liveness. */
  onContinue: () => void
}) {
  const allowedRegion: KycRegion = country?.region ?? "nigeria"
  const [region, setRegion] = React.useState<KycRegion>(allowedRegion)
  const [idType, setIdType] = React.useState<NigeriaIdMethod>("bvn")
  // Only one ID is verified: switching BVN ⇄ NIN starts a fresh number.
  const [idNumber, setIdNumber] = React.useState("")
  const [method, setMethod] =
    React.useState<InternationalDocumentType>("passport")
  const [front, setFront] = React.useState<File | null>(null)
  const [back, setBack] = React.useState<File | null>(null)

  if (isKycDone(identity.status)) {
    return <IdentityVerified identity={identity} onContinue={onContinue} />
  }

  const outOfAttempts = identity.attemptsRemaining <= 0
  const activeIdType = NIGERIA_ID_TYPES.find((type) => type.id === idType)!
  const isValid = region === "nigeria" ? idNumber.length === 11 : front !== null

  return (
    <KycStepForm
      title="Select Verification Region"
      description="Provide government identification credentials corresponding to your country."
      submitLabel="Submit for verification"
      submitDisabled={!isValid || outOfAttempts}
      pending={pending}
      onSubmit={() => {
        if (region === "nigeria") {
          onSubmitNigeria({ method: idType, idNumber })
        } else if (front) {
          onSubmitInternational({
            documentType: method,
            front,
            back: method === "drivers_license" ? back : null,
          })
        }
      }}
    >
      <div
        role="radiogroup"
        aria-label="Verification region"
        className="grid gap-3 sm:grid-cols-2"
      >
        <RadioCard
          checked={region === "nigeria"}
          onSelect={() => setRegion("nigeria")}
          disabled={allowedRegion !== "nigeria"}
          title="Nigeria Identity"
          description={
            allowedRegion === "nigeria"
              ? "BVN / NIN"
              : "Only for Nigerian profiles"
          }
        />
        <RadioCard
          checked={region === "international"}
          onSelect={() => setRegion("international")}
          disabled={allowedRegion !== "international"}
          title="International ID"
          description={
            allowedRegion === "international"
              ? "Passport / Driver’s License"
              : "Not available for Nigeria"
          }
        />
      </div>

      <AttemptsNotice
        failureReason={identity.failureReason}
        attemptsRemaining={identity.attemptsRemaining}
        retryAvailableAt={identity.retryAvailableAt}
      />

      <div className="mt-5 short:mt-3">
        <p className="text-sm font-medium text-[#344054]">
          Select Identity Verification Method <span aria-hidden="true">*</span>
        </p>
        {region === "nigeria" && (
          <p className="mt-0.5 text-xs text-[#667085]">
            Choose one: we only need your BVN <em>or</em> your NIN.
          </p>
        )}

        {region === "nigeria" ? (
          <>
            <SegmentedTabs
              className="mt-2"
              label="Nigerian ID type"
              options={NIGERIA_ID_TYPES}
              value={idType}
              onChange={(next) => {
                setIdType(next)
                setIdNumber("")
              }}
            />
            <Label htmlFor="kyc-id-number" className="sr-only">
              {activeIdType.name}
            </Label>
            <Input
              key={idType}
              id="kyc-id-number"
              inputMode="numeric"
              autoComplete="off"
              maxLength={11}
              placeholder={`Enter your 11-digit ${activeIdType.label}`}
              value={idNumber}
              onChange={(event) =>
                setIdNumber(event.target.value.replace(/\D/g, ""))
              }
              className="mt-2 h-15 short:h-12"
              required
            />
            <p className="mt-2 text-xs text-[#667085]">
              {idType === "bvn"
                ? "Dial *565*0# on your registered line to get your BVN."
                : "Dial *346# on your registered line to get your NIN."}
            </p>
          </>
        ) : (
          <>
            <SegmentedTabs
              className="mt-2"
              label="Verification method"
              options={INTERNATIONAL_METHODS}
              value={method}
              onChange={setMethod}
            />
            <FileDropzone
              className="mt-2"
              file={front}
              onFileChange={setFront}
              label={
                method === "passport"
                  ? "passport photo page"
                  : "front of your driver’s license"
              }
            />
            {method === "drivers_license" && (
              <FileDropzone
                className="mt-2"
                file={back}
                onFileChange={setBack}
                label="back of your driver’s license (optional)"
                hint="Back side (optional)"
              />
            )}
          </>
        )}
      </div>
    </KycStepForm>
  )
}

/** Failure reason / attempts left from GET /kyc/status. */
export function AttemptsNotice({
  failureReason,
  attemptsRemaining,
  retryAvailableAt,
}: {
  failureReason: string | null
  attemptsRemaining: number
  retryAvailableAt: string | null
}) {
  if (!failureReason && attemptsRemaining > 0) return null
  const locked = attemptsRemaining <= 0
  return (
    <p
      role="status"
      className={cn(
        "mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-sm short:mt-3",
        locked ? "bg-danger-50 text-[#B42318]" : "bg-[#FFF6E5] text-[#B54708]"
      )}
    >
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0" strokeWidth={1.75} />
      <span>
        {failureReason && <>{failureReason} </>}
        {locked
          ? `No attempts left${
              retryAvailableAt
                ? ` — try again after ${new Date(retryAvailableAt).toLocaleString()}`
                : " today"
            }.`
          : `${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left.`}
      </span>
    </p>
  )
}

function IdentityVerified({
  identity,
  onContinue,
}: {
  identity: IdentityStatus
  onContinue: () => void
}) {
  const label =
    identity.method === "bvn" || identity.method === "nin"
      ? identity.method.toUpperCase()
      : identity.method === "passport"
        ? "Passport"
        : "Driver’s License"
  return (
    <div className="flex flex-1 flex-col">
      <h2 className="text-2xl font-medium tracking-tight text-ink sm:text-[28px] short:text-2xl">
        Identity verified
      </h2>
      <p className="mt-1 text-base text-[#475467] sm:text-lg short:text-base">
        Your ID has been checked. Next, a quick selfie to confirm it’s you.
      </p>
      <div className="mt-8 flex items-center gap-3 rounded-xl border border-line p-4">
        <CheckCircle2Icon className="size-6 shrink-0 fill-[#12A633] text-white" />
        <div>
          <p className="text-base font-medium text-ink">{label}</p>
          {identity.maskedIdNumber && (
            <p className="text-sm text-[#667085]">{identity.maskedIdNumber}</p>
          )}
        </div>
      </div>
      <Button size="xl" className="mt-auto w-full" onClick={onContinue}>
        Continue to liveness check
      </Button>
    </div>
  )
}

function FileDropzone({
  file,
  onFileChange,
  label,
  hint,
  className,
}: {
  file: File | null
  onFileChange: (file: File | null) => void
  label: string
  /** Visible line above the size note, e.g. "Back side (optional)" */
  hint?: string
  className?: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [dragging, setDragging] = React.useState(false)

  const accept = (candidate: File | undefined) => {
    if (!candidate) return
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setError("Please upload a PNG or JPG image.")
      return
    }
    if (candidate.size > MAX_UPLOAD_BYTES) {
      setError("That file is larger than 2MB.")
      return
    }
    setError(null)
    onFileChange(candidate)
  }

  if (file) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-xl border border-line p-4",
          className
        )}
      >
        <span className="grid size-10 place-items-center rounded-full bg-brand-50 text-brand">
          <FileIcon className="size-5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-ink">
            {file.name}
          </span>
          <span className="text-xs text-[#667085]">
            {(file.size / 1024).toFixed(0)} KB
          </span>
        </span>
        <button
          type="button"
          aria-label="Remove file"
          onClick={() => onFileChange(null)}
          className="rounded-md p-1.5 text-[#667085] hover:bg-muted hover:text-ink"
        >
          <XIcon className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          accept(event.dataTransfer.files[0])
        }}
        className={cn(
          "flex w-full flex-col items-center rounded-xl border px-6 py-3.5 text-center transition outline-none focus-visible:ring-4 focus-visible:ring-brand/15 short:py-2.5",
          dragging
            ? "border-brand bg-brand-50"
            : "border-line hover:bg-[#FCFCFD]"
        )}
      >
        <span className="grid size-10 place-items-center rounded-full border-[6px] border-[#F9FAFB] bg-[#F2F4F7] text-[#475467] short:hidden">
          <UploadCloudIcon className="size-4" strokeWidth={1.75} />
        </span>
        <span className="mt-3 text-sm text-[#475467] short:mt-0">
          <span className="font-semibold text-[#1E2A5E]">Click to upload</span>{" "}
          or drag and drop
        </span>
        <span className="mt-1 text-xs text-[#475467]">
          {hint ? `${hint} · ` : ""}PNG, JPG (up to 2MB)
        </span>
        <span className="sr-only">Upload your {label}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          accept(event.target.files?.[0])
          event.target.value = ""
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
