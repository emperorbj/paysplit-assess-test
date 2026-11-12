"use client"

import * as React from "react"
import { CameraOffIcon } from "lucide-react"

import { AttemptsNotice } from "@/components/kyc/identity-step"
import { KycStepForm } from "@/components/kyc/step-layout"
import { Button } from "@/components/ui/button"
import type { KycStatusResponse } from "@/types/api/kyc"

type CameraState = "starting" | "settling" | "live" | "blocked" | "unsupported"

/** Gives the webcam time to adjust exposure and focus before the first shot. */
const CAMERA_SETTLE_MS = 2000

export function LivenessStep({
  pending,
  liveness,
  onCapture,
}: {
  pending: boolean
  /** Attempts / last failure from GET /kyc/status */
  liveness: KycStatusResponse["steps"]["liveness"]
  /** Receives the captured selfie as a JPEG blob for upload. */
  onCapture: (selfie: Blob) => void
}) {
  const faceRef = React.useRef<HTMLVideoElement>(null)
  const backdropRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const settleTimerRef = React.useRef<number | undefined>(undefined)
  const [state, setState] = React.useState<CameraState>("starting")

  const startCamera = React.useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unsupported")
      return
    }
    setState("starting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 } },
        audio: false,
      })
      streamRef.current = stream
      for (const video of [faceRef.current, backdropRef.current]) {
        if (video) video.srcObject = stream
      }
      setState("settling")
      settleTimerRef.current = window.setTimeout(
        () => setState("live"),
        CAMERA_SETTLE_MS
      )
    } catch {
      setState("blocked")
    }
  }, [])

  React.useEffect(() => {
    // Camera access is an external system, so starting it is a genuine effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void startCamera()
    return () => {
      window.clearTimeout(settleTimerRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [startCamera])

  const takeShot = () => {
    const video = faceRef.current
    if (!video || !video.videoWidth) return
    // Crop a centred square. Only the preview is mirrored: the upload must be
    // the true image, because it's matched against the BVN/NIN record photo.
    const size = Math.min(video.videoWidth, video.videoHeight)
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(
      video,
      (video.videoWidth - size) / 2,
      (video.videoHeight - size) / 2,
      size,
      size,
      0,
      0,
      size,
      size
    )
    canvas.toBlob((blob) => blob && onCapture(blob), "image/jpeg", 0.9)
  }

  return (
    <KycStepForm
      title="Biometric Liveness Verification"
      description="Ensure you are in good lighting. Look directly into the camera frame."
      submitLabel={liveness.failureReason ? "Retake shot" : "Take shot"}
      submitDisabled={state !== "live" || liveness.attemptsRemaining <= 0}
      pending={pending}
      onSubmit={takeShot}
    >
      <div className="relative h-[280px] overflow-hidden rounded-[20px] bg-[#F2F2F2] lg:h-auto lg:max-h-[328px] lg:min-h-[160px] lg:flex-1">
        {/* Blurred, washed-out copy of the feed behind the face circle */}
        <video
          ref={backdropRef}
          autoPlay
          muted
          playsInline
          aria-hidden="true"
          style={{ transform: "scale(-1.1, 1.1)" }}
          className="absolute inset-0 size-full object-cover opacity-25 blur-md"
        />
        <div className="absolute inset-0 bg-white/40" />

        <div className="absolute top-1/2 left-1/2 aspect-square h-[80%] max-h-[258px] -translate-1/2 overflow-hidden rounded-full border-[3px] border-[#12A633] bg-[#E5E5E5]">
          <video
            ref={faceRef}
            autoPlay
            muted
            playsInline
            aria-label="Camera preview"
            className="size-full -scale-x-100 object-cover"
          />
          {state !== "live" && state !== "settling" && (
            <div className="absolute inset-0 grid place-items-center bg-[#EFEFEF] p-6 text-center">
              {state === "starting" ? (
                <p className="text-sm text-[#667085]">Starting camera…</p>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <CameraOffIcon
                    className="size-6 text-[#667085]"
                    strokeWidth={1.75}
                  />
                  <p className="text-sm text-[#475467]">
                    {state === "blocked"
                      ? "Camera access is blocked. Allow it in your browser settings."
                      : "This browser can’t access a camera."}
                  </p>
                  {state === "blocked" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={startCamera}
                    >
                      Try again
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="mt-4 shrink-0 text-center text-sm font-medium text-ink">
        {pending
          ? "Checking your selfie…"
          : state === "settling"
            ? "Getting the camera ready…"
            : "Position your face inside the oval"}
      </p>
      <AttemptsNotice
        failureReason={liveness.failureReason}
        attemptsRemaining={liveness.attemptsRemaining}
        retryAvailableAt={liveness.retryAvailableAt}
      />
    </KycStepForm>
  )
}
