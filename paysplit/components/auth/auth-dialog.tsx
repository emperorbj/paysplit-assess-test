"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { EyeIcon, EyeOffIcon, StarIcon } from "lucide-react"

import { LogoMark } from "@/components/brand/logo"
import {
  isStrongPassword,
  PasswordRequirements,
} from "@/components/auth/password-requirements"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input, Label } from "@/components/ui/input"
import { LoadingButton } from "@/components/ui/loading-button"
import {
  Modal,
  ModalDescription,
  ModalDivider,
  ModalTitle,
} from "@/components/ui/modal"
import { SuccessBadge } from "@/components/ui/success-badge"
import { useLogin, useSignup } from "@/hooks/auth/use-auth"

export type AuthStep = "login" | "signup" | "welcome"

type AuthDialogProps = {
  step: AuthStep | null
  onStepChange: (step: AuthStep | null) => void
}

export function AuthDialog({ step, onStepChange }: AuthDialogProps) {
  const router = useRouter()
  const [firstName, setFirstName] = React.useState("")

  // Keep the last step rendered while the close animation plays.
  const [renderedStep, setRenderedStep] = React.useState<AuthStep>("login")
  if (step && step !== renderedStep) setRenderedStep(step)

  const close = () => onStepChange(null)

  return (
    <Modal
      open={step !== null}
      onOpenChange={(open) => {
        if (!open) close()
      }}
      className={renderedStep === "welcome" ? "max-w-[803px]" : undefined}
    >
      {renderedStep === "login" && (
        <LoginStep
          onCreateAccount={() => onStepChange("signup")}
          onSuccess={() => {
            close()
            router.push("/dashboard")
          }}
        />
      )}
      {renderedStep === "signup" && (
        <SignupStep
          onSignIn={() => onStepChange("login")}
          onSuccess={(name) => {
            setFirstName(name)
            onStepChange("welcome")
          }}
        />
      )}
      {renderedStep === "welcome" && (
        <WelcomeStep
          firstName={firstName}
          onDashboard={() => {
            close()
            router.push("/dashboard")
          }}
          onKyc={() => {
            close()
            router.push("/kyc")
          }}
        />
      )}
    </Modal>
  )
}

/* ------------------------------ Shared pieces ----------------------------- */

function StepHeader({
  title,
  description,
}: {
  title: string
  description: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center px-6 pt-6 text-center">
      <LogoMark variant="ink" className="size-12" />
      <ModalTitle className="mt-3 text-2xl font-medium tracking-tight text-black">
        {title}
      </ModalTitle>
      <ModalDescription className="mt-1 text-sm text-[#475467]">
        {description}
      </ModalDescription>
    </div>
  )
}

function FooterPrompt({
  prompt,
  action,
  onAction,
}: {
  prompt: string
  action: string
  onAction: () => void
}) {
  return (
    <p className="mt-4 text-center text-base text-[#667085]">
      {prompt}{" "}
      <button
        type="button"
        onClick={onAction}
        className="font-semibold text-brand underline underline-offset-4 hover:text-brand/80"
      >
        {action}
      </button>
    </p>
  )
}

function PasswordInput({
  id,
  name,
  value,
  onChange,
  autoComplete,
  placeholder = "••••••",
  describedBy,
}: {
  id: string
  name: string
  value?: string
  onChange?: (value: string) => void
  autoComplete: string
  placeholder?: string
  describedBy?: string
}) {
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        aria-describedby={describedBy}
        className="pr-12"
        required
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-3 my-auto grid size-8 place-items-center rounded-md text-[#344054] hover:bg-muted"
      >
        {visible ? (
          <EyeOffIcon className="size-5" strokeWidth={1.75} />
        ) : (
          <EyeIcon className="size-5" strokeWidth={1.75} />
        )}
      </button>
    </div>
  )
}

/* ---------------------------------- Login --------------------------------- */

function LoginStep({
  onCreateAccount,
  onSuccess,
}: {
  onCreateAccount: () => void
  onSuccess: () => void
}) {
  const [emailValue, setEmailValue] = React.useState("")
  const [remember, setRemember] = React.useState(false)
  const login = useLogin()

  return (
    <form
      className="pb-6"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const email = emailValue.trim()
        login.mutate(
          {
            email,
            password: String(data.get("password") ?? ""),
            rememberMe: remember,
          },
          { onSuccess }
        )
      }}
    >
      <StepHeader
        title="Welcome back!"
        description="Please enter your details, to log in to your account"
      />

      <div className="mt-6 space-y-4 px-6">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password">Password</Label>
          <PasswordInput
            id="login-password"
            name="password"
            autoComplete="current-password"
          />
        </div>

        <div className="pt-2">
          <Checkbox
            label="Remember for 30 days"
            checked={remember}
            onCheckedChange={setRemember}
          />
        </div>
      </div>

      <ModalDivider />

      <div className="px-6">
        <LoadingButton
          type="submit"
          size="xl"
          className="w-full"
          loading={login.isPending}
        >
          Confirm
        </LoadingButton>
        <FooterPrompt
          prompt="Don’t have an account?"
          action="Create One"
          onAction={onCreateAccount}
        />
      </div>
    </form>
  )
}

/* --------------------------------- Sign up -------------------------------- */

/** Names, email and password in one step; the account is signed in on success. */
function SignupStep({
  onSignIn,
  onSuccess,
}: {
  onSignIn: () => void
  onSuccess: (firstName: string) => void
}) {
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const signup = useSignup()
  const mismatch = confirm !== "" && confirm !== password
  const valid = isStrongPassword(password) && password === confirm

  return (
    <form
      className="pb-6"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        signup.mutate(
          {
            firstName: String(data.get("firstName") ?? "").trim(),
            lastName: String(data.get("lastName") ?? "").trim(),
            email: String(data.get("email") ?? "").trim(),
            password,
            confirmPassword: confirm,
          },
          { onSuccess: (auth) => onSuccess(auth.user.firstName) }
        )
      }}
    >
      <StepHeader
        title="Create an account"
        description="Enter your details to create your account"
      />

      <div className="mt-6 space-y-4 px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="signup-first-name">First Name</Label>
            <Input
              id="signup-first-name"
              name="firstName"
              autoComplete="given-name"
              placeholder="Enter first name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-last-name">Last Name</Label>
            <Input
              id="signup-last-name"
              name="lastName"
              autoComplete="family-name"
              placeholder="Enter last name"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-email">Email address</Label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <PasswordInput
            id="signup-password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            describedBy="signup-password-rules"
          />
          <PasswordRequirements password={password} className="pt-1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-confirm">Confirm password</Label>
          <PasswordInput
            id="signup-confirm"
            name="confirmPassword"
            autoComplete="new-password"
            value={confirm}
            onChange={setConfirm}
          />
          {mismatch && (
            <p role="alert" className="text-sm text-destructive">
              Passwords don’t match.
            </p>
          )}
        </div>
      </div>

      <ModalDivider />

      <div className="px-6">
        <LoadingButton
          type="submit"
          size="xl"
          className="w-full"
          disabled={!valid}
          loading={signup.isPending}
        >
          Create account
        </LoadingButton>
        <FooterPrompt
          prompt="Already have an account?"
          action="Sign in"
          onAction={onSignIn}
        />
      </div>
    </form>
  )
}

/* --------------------------------- Welcome -------------------------------- */

function WelcomeStep({
  firstName,
  onDashboard,
  onKyc,
}: {
  firstName: string
  onDashboard: () => void
  onKyc: () => void
}) {
  return (
    <div className="pb-6">
      <SuccessBadge className="pt-20 pb-16" />

      <div className="px-6 text-center">
        <ModalTitle className="text-2xl font-medium tracking-tight text-[#101828]">
          Welcome to PaySplit{firstName ? `, ${firstName}` : ""}
        </ModalTitle>
        <ModalDescription className="mx-auto mt-2 max-w-[520px] text-sm text-[#475467]">
          Your account and security credentials are confirmed. Let&apos;s
          personalise your profile and set up your salary partitions in under 3
          minutes.
        </ModalDescription>
      </div>

      <div className="mt-6 grid gap-4 px-6 sm:grid-cols-2">
        <WelcomeCard
          step={1}
          title="Profile & Identity Verification"
          description="Biometric liveness"
        />
        <WelcomeCard
          step={2}
          title="Setup Checklist"
          description="Income, vaults & rules"
        />
      </div>

      <ModalDivider />

      <div className="grid gap-4 px-6 sm:grid-cols-2">
        <Button
          variant="outline"
          size="xl"
          className="w-full border-input text-[#344054]"
          onClick={onDashboard}
        >
          Go to Dashboard
        </Button>
        <Button size="xl" className="w-full" onClick={onKyc}>
          Continue to KYC
        </Button>
      </div>
    </div>
  )
}

function WelcomeCard({
  step,
  title,
  description,
}: {
  step: number
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-line p-6">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F2F4F7] px-3 py-1.5 text-sm text-[#667085]">
        <StarIcon className="size-4 fill-current" strokeWidth={0} />
        Step {step}
      </span>
      <h3 className="mt-4 text-lg font-semibold text-[#101828]">{title}</h3>
      <p className="mt-2 text-sm text-[#475467]">{description}</p>
    </div>
  )
}
