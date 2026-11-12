"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRightIcon } from "lucide-react"
import { toast } from "sonner"

import { AuthDialog, type AuthStep } from "@/components/auth/auth-dialog"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

const NAV_LINKS = [
  { label: "About PaySplit", href: "#about" },
  { label: "Blog", href: "#blog" },
  { label: "Contact", href: "#contact" },
]

/*
 * Desktop positions are taken from the 1440 × 903 Figma frame and expressed in
 * container-width units (1cqw = 14.4px at 1440) so the composition scales as one.
 */
export function LandingPage({
  initialAuthStep = null,
  sessionExpired = false,
}: {
  /** Lets `/?auth=login` or `/?auth=signup` open the matching modal on load. */
  initialAuthStep?: AuthStep | null
  /** Set by the API client when a signed-in request came back 401. */
  sessionExpired?: boolean
}) {
  const [authStep, setAuthStep] = React.useState<AuthStep | null>(
    initialAuthStep
  )

  React.useEffect(() => {
    if (sessionExpired) {
      toast.warning("Your session has expired. Please log in again.", {
        id: "session-expired",
      })
    }
  }, [sessionExpired])

  return (
    <>
      <section
        className="@container relative isolate min-h-svh overflow-hidden bg-ink text-white lg:aspect-[1440/903] lg:min-h-0"
        style={{
          backgroundImage: [
            "radial-gradient(55% 60% at 0% 65%, rgba(20,98,156,0.55), transparent 70%)",
            "radial-gradient(35% 45% at 70% 35%, rgba(255,255,255,0.05), transparent 70%)",
          ].join(","),
        }}
      >
        <SiteHeader
          onLogin={() => setAuthStep("login")}
          onGetStarted={() => setAuthStep("signup")}
        />

        <div className="relative z-10 px-5 pt-12 sm:px-8 lg:absolute lg:top-[18.4cqw] lg:left-[3.9cqw] lg:p-0">
          <h1 className="max-w-[12ch] text-[2.75rem] leading-[0.95] font-normal tracking-[-0.01em] sm:text-6xl lg:max-w-none lg:text-[4.5cqw] lg:leading-[0.925] lg:tracking-normal">
            We automate
            <br className="hidden lg:block" /> salary partitions
            <br className="hidden lg:block" /> that ignite
            <br className="hidden lg:block" /> financial clarity.
          </h1>
          <StoreButtons className="mt-8 lg:mt-[1.8cqw]" />
        </div>

        <HeroArt />

        {/* Lit platform the laptop sits on (desktop only) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-[53.6cqw] left-[2.78cqw] hidden h-[9.1cqw] w-[94.44cqw] overflow-hidden lg:block"
        >
          <Image
            src="/images/landing/platform.webp"
            alt=""
            width={3194}
            height={744}
            sizes="111vw"
            className="h-auto w-[110.9cqw] max-w-none"
          />
        </div>
      </section>

      <AuthDialog step={authStep} onStepChange={setAuthStep} />
    </>
  )
}

function SiteHeader({
  onLogin,
  onGetStarted,
}: {
  onLogin: () => void
  onGetStarted: () => void
}) {
  return (
    <header className="relative z-20 flex h-20 items-center justify-between gap-4 px-5 sm:px-8 lg:h-[100px] lg:px-[3.6cqw]">
      <Link href="/" aria-label="Paysplit home">
        <Logo />
      </Link>

      <nav
        aria-label="Primary"
        className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 md:flex"
      >
        {NAV_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-base text-white/90 transition hover:text-white"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-2 sm:gap-8">
        <button
          type="button"
          onClick={onLogin}
          className="inline-flex items-center gap-2 text-sm text-white/90 transition hover:text-white sm:text-[15px]"
        >
          Login
          <ArrowRightIcon
            className="hidden size-5 sm:block"
            strokeWidth={1.75}
          />
        </button>
        <Button
          size="xl"
          onClick={onGetStarted}
          className="h-10 px-3 text-sm sm:h-12 sm:px-5 sm:text-[15px]"
        >
          Get Started
          <ArrowRightIcon strokeWidth={1.75} />
        </Button>
      </div>
    </header>
  )
}

function StoreButtons({ className }: { className?: string }) {
  const stores = [
    {
      eyebrow: "Download on the",
      name: "App Store",
      icon: "/icons/apple.svg",
      href: "#app-store",
    },
    {
      eyebrow: "Download on the",
      name: "Google play",
      icon: "/icons/google-play.svg",
      href: "#google-play",
    },
  ]

  return (
    <div className={`flex flex-wrap gap-2.5 ${className ?? ""}`}>
      {stores.map((store) => (
        <a
          key={store.name}
          href={store.href}
          className="flex h-[58px] items-center gap-3 rounded-2xl border border-white/5 bg-black/70 px-5 pr-6 transition hover:bg-black"
        >
          <Image
            src={store.icon}
            alt=""
            width={24}
            height={24}
            className="size-6"
          />
          <span className="flex flex-col leading-tight">
            <span className="text-xs text-white/70">{store.eyebrow}</span>
            <span className="text-base font-medium">{store.name}</span>
          </span>
        </a>
      ))}
    </div>
  )
}

function HeroArt() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative mt-14 ml-[8%] w-[120%] max-w-none sm:ml-[20%] sm:w-[95%] lg:absolute lg:top-[18.75cqw] lg:left-[18.75cqw] lg:m-0 lg:w-[70.14cqw]"
    >
      <Image
        src="/images/landing/macbook.webp"
        alt=""
        width={2020}
        height={1226}
        // The laptop is the largest element on first paint.
        loading="eager"
        sizes="(min-width: 1024px) 70vw, 120vw"
        className="h-auto w-full"
      />
      {/* Dashboard screenshot sits in the laptop's display */}
      <Image
        src="/images/landing/dashboard-screen.webp"
        alt=""
        width={1304}
        height={1122}
        sizes="(min-width: 1024px) 46vw, 78vw"
        preload
        className="absolute top-[1.3%] left-[34.06%] h-auto w-[64.55%]"
      />
    </div>
  )
}
