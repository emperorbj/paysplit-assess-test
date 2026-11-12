"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon, CheckIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Modal, ModalDescription, ModalTitle } from "@/components/ui/modal"
import type { OnboardingChecklist as Onboarding } from "@/lib/dashboard"

const ITEMS = [
  {
    key: "signup",
    title: "Signup Account",
    description: "Create your Paysplit account",
    href: "/",
  },
  {
    key: "kyc",
    title: "Complete KYC",
    description: "Verify using a government-issued ID",
    href: "/kyc",
  },
  {
    key: "setup",
    title: "Setup Checklist",
    description: "Add salary source and set your first rule.",
    href: "/dashboard?setup=1",
  },
] as const

export function OnboardingBanner({ onboarding }: { onboarding: Onboarding }) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <div className="px-4 pt-6 sm:px-9 sm:pt-9">
        <div className="flex flex-col gap-4 rounded-[20px] border border-brand/45 bg-linear-to-r from-white to-brand-50/70 p-5 sm:flex-row sm:items-center sm:px-5 sm:py-5 md:mx-7">
          <Image
            src="/images/kyc/id-card.png"
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0"
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold">
              <span className="text-brand">Complete</span>{" "}
              <span className="text-[#1C3A5A]">Onboarding</span>
            </p>
            <p className="mt-1 text-sm text-ink">
              Verify your account to upgrade to a Tier 2. Unlock splitting and
              get a dedicated account number
            </p>
          </div>
          <Button
            size="xl"
            className="shrink-0 px-5"
            onClick={() => setOpen(true)}
          >
            Complete Onboarding
            <ArrowRightIcon className="size-4" strokeWidth={2} />
          </Button>
        </div>
        <hr className="mt-4 border-line" />
      </div>

      <OnboardingChecklist
        open={open}
        onOpenChange={setOpen}
        onboarding={onboarding}
      />
    </>
  )
}

function OnboardingChecklist({
  open,
  onOpenChange,
  onboarding,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onboarding: Onboarding
}) {
  const done = ITEMS.filter((item) => onboarding[item.key]).length
  const percent = Math.round((done / ITEMS.length) * 100)

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      className="max-w-[420px] bg-[#F8F8F8]"
    >
      <p className="px-7 pt-5 pb-3 text-lg text-ink">Complete Onboarding</p>
      <div className="mx-2 mb-2 rounded-[20px] border border-line bg-white">
        <div className="flex items-center gap-4 border-b border-line p-5">
          <div className="min-w-0 flex-1">
            <ModalTitle className="text-2xl leading-tight font-semibold text-ink">
              Complete your account setup
            </ModalTitle>
            <ModalDescription className="mt-2 text-xs text-ink">
              Verify your account to upgrade to a Tier 2. Unlock splitting and
              get a dedicated account number
            </ModalDescription>
          </div>
          <ProgressRing percent={percent} />
        </div>

        <ul className="space-y-3 p-5">
          {ITEMS.map((item) => {
            const isDone = onboarding[item.key]
            return (
              <li
                key={item.key}
                className="flex items-center gap-3 rounded-2xl border border-line p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-medium text-ink">{item.title}</p>
                  <p className="mt-1 text-sm text-[#475467]">
                    {item.description}
                  </p>
                </div>
                {isDone ? (
                  <span className="flex items-center gap-1.5 rounded-full bg-[#EEEEEE] px-3 py-1.5 text-sm text-[#8C8C8C]">
                    <span className="grid size-4 place-items-center rounded-full bg-[#12A633]">
                      <CheckIcon
                        className="size-2.5 text-white"
                        strokeWidth={3.5}
                      />
                    </span>
                    Done
                  </span>
                ) : (
                  <Button
                    size="sm"
                    className="h-8 px-3"
                    nativeButton={false}
                    render={
                      <Link
                        href={item.href}
                        onClick={() => onOpenChange(false)}
                      />
                    }
                  >
                    Start
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </Modal>
  )
}

function ProgressRing({ percent }: { percent: number }) {
  const radius = 42
  const circumference = 2 * Math.PI * radius
  return (
    <div
      role="img"
      aria-label={`${percent}% complete`}
      className="relative grid size-[120px] shrink-0 place-items-center"
    >
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#EAF6FF"
          strokeWidth="20"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#33A7F5"
          strokeWidth="20"
          strokeDasharray={`${(percent / 100) * circumference} ${circumference}`}
        />
      </svg>
      <span className="relative text-xl text-ink">{percent}%</span>
    </div>
  )
}
