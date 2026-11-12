"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { EyeIcon, EyeOffIcon, StarIcon } from "lucide-react"

import { LogoMark } from "@/components/brand/logo"
import { OtpInput } from "@/components/auth/otp-input"
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
import {
  useForgotPassword,
  useLogin,
  useResendEmailCode,
  useResetPassword,
  useSetPassword,
  useSignup,
  useVerifyEmail,
  useVerifyResetCode,
} from "@/hooks/auth/use-auth"
import { toApiError } from "@/lib/api/errors"
import { ACCOUNT_SETUP_INCOMPLETE } from "@/types/api/auth"

export type AuthStep =
  | "login"
  | "signup"
  | "verify"
  | "password"
  | "welcome"
  | "forgot"
  | "forgot-verify"
  | "forgot-reset"

type AuthDialogProps = {
  step: AuthStep | null
  onStepChange: (step: AuthStep | null) => void
}

/** Default cooldown when the backend doesn't say (seconds). */
const RESEND_COOLDOWN = 60

export function AuthDialog({ step, onStepChange }: AuthDialogProps) {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [firstName, setFirstName] = React.useState("")
  const [resendAt, setResendAt] = React.useState(0)
  // Short-lived signup token: memory only, never persisted.
  const [setupToken, setSetupToken] = React.useState<string | null>(null)

  // Keep the last step rendered while the close animation plays.
  const [renderedStep, setRenderedStep] = React.useState<AuthStep>("login")
  if (step && step !== renderedStep) setRenderedStep(step)

  const close = () => onStepChange(null)
  const startCooldown = (seconds = RESEND_COOLDOWN) =>
    setResendAt(Date.now() + seconds * 1000)

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
          defaultEmail={email}
          onCreateAccount={() => onStepChange("signup")}
          onForgotPassword={(value) => {
            setEmail(value)
            onStepChange("forgot")
          }}
          onSetupIncomplete={(value) => {
            // Backend already emailed a fresh code.
            setEmail(value)
            startCooldown()
            onStepChange("verify")
          }}
          onSuccess={() => {
            close()
            router.push("/dashboard")
          }}
        />
      )}
      {renderedStep === "signup" && (
        <SignupStep
          onSignIn={() => onStepChange("login")}
          onSuccess={({ email, firstName, resendAvailableInSeconds }) => {
            setEmail(email)
            setFirstName(firstName)
            startCooldown(resendAvailableInSeconds)
            onStepChange("verify")
          }}
        />
      )}
      {renderedStep === "verify" && (
        <EmailVerifyStep
          email={email}
          resendAt={resendAt}
          onResent={startCooldown}
          onSuccess={({ setupToken, firstName }) => {
            setSetupToken(setupToken)
            setFirstName(firstName)
            onStepChange("password")
          }}
        />
      )}
      {renderedStep === "password" && (
        <CreatePasswordStep
          setupToken={setupToken}
          onExpired={() => onStepChange("verify")}
          onSuccess={(name) => {
            setSetupToken(null)
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
      {renderedStep === "forgot" && (
        <ForgotEmailStep
          defaultEmail={email}
          onBack={() => onStepChange("login")}
          onSuccess={(value) => {
            setEmail(value)
            startCooldown()
            onStepChange("forgot-verify")
          }}
        />
      )}
      {renderedStep === "forgot-verify" && (
        <ResetVerifyStep
          email={email}
          resendAt={resendAt}
          onResent={startCooldown}
          onSuccess={() => onStepChange("forgot-reset")}
        />
      )}
      {renderedStep === "forgot-reset" && (
        <ResetPasswordStep
          email={email}
          onSuccess={() => onStepChange("login")}
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

/** Seconds left until `target` (ms timestamp), ticking every second. */
function useSecondsUntil(target: number) {
  const [now, setNow] = React.useState(() => Date.now())
  React.useEffect(() => {
    if (target <= Date.now()) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [target])
  return Math.max(0, Math.ceil((target - now) / 1000))
}

function ResendPrompt({
  resendAt,
  pending,
  onResend,
}: {
  resendAt: number
  pending: boolean
  onResend: () => void
}) {
  const seconds = useSecondsUntil(resendAt)
  const label = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
  return (
    <p className="mt-4 text-center text-sm text-[#475467]" aria-live="polite">
      Didn’t get a code?{" "}
      {seconds > 0 ? (
        <span className="tabular-nums">Resend in {label}</span>
      ) : (
        <button
          type="button"
          onClick={onResend}
          disabled={pending}
          className="underline underline-offset-4 hover:text-ink disabled:opacity-50"
        >
          {pending ? "Sending…" : "Click to resend"}
        </button>
      )}
      .
    </p>
  )
}

/* ---------------------------------- Login --------------------------------- */

function LoginStep({
  defaultEmail,
  onCreateAccount,
  onForgotPassword,
  onSetupIncomplete,
  onSuccess,
}: {
  defaultEmail: string
  onCreateAccount: () => void
  onForgotPassword: (email: string) => void
  onSetupIncomplete: (email: string) => void
  onSuccess: () => void
}) {
  const [emailValue, setEmailValue] = React.useState(defaultEmail)
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
          {
            onSuccess,
            onError: (error) => {
              if (toApiError(error).code === ACCOUNT_SETUP_INCOMPLETE) {
                onSetupIncomplete(email)
              }
            },
          }
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

        <div className="flex items-center justify-between pt-2">
          <Checkbox
            label="Remember for 30 days"
            checked={remember}
            onCheckedChange={setRemember}
          />
          <button
            type="button"
            onClick={() => onForgotPassword(emailValue.trim())}
            className="text-sm text-brand hover:underline"
          >
            Forgot password
          </button>
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

function SignupStep({
  onSignIn,
  onSuccess,
}: {
  onSignIn: () => void
  onSuccess: (data: {
    email: string
    firstName: string
    resendAvailableInSeconds: number
  }) => void
}) {
  const signup = useSignup()

  return (
    <form
      className="pb-6"
      onSubmit={(event) => {
        event.preventDefault()
        const data = new FormData(event.currentTarget)
        const dto = {
          firstName: String(data.get("firstName") ?? "").trim(),
          lastName: String(data.get("lastName") ?? "").trim(),
          email: String(data.get("email") ?? "").trim(),
        }
        signup.mutate(dto, {
          onSuccess: (response) =>
            onSuccess({
              email: response.email,
              firstName: dto.firstName,
              resendAvailableInSeconds: response.resendAvailableInSeconds,
            }),
        })
      }}
    >
      <StepHeader
        title="Create an account"
        description="Enter your email to create account"
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
      </div>

      <ModalDivider />

      <div className="px-6">
        <LoadingButton
          type="submit"
          size="xl"
          className="w-full"
          loading={signup.isPending}
        >
          Confirm
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

/* ------------------------------ Verify (signup) --------------------------- */

function CodeForm({
  title,
  email,
  submitLabel,
  pending,
  resendAt,
  resendPending,
  onResend,
  onSubmit,
}: {
  title: string
  email: string
  submitLabel: string
  pending: boolean
  resendAt: number
  resendPending: boolean
  onResend: () => void
  onSubmit: (code: string, reset: () => void) => void
}) {
  const [code, setCode] = React.useState("")

  return (
    <form
      className="pb-6"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(code, () => setCode(""))
      }}
    >
      <StepHeader
        title={title}
        description={<>We&apos;ve sent a code to {email}</>}
      />

      <div className="mt-8 px-6">
        <OtpInput value={code} onChange={setCode} autoFocus />
        <ResendPrompt
          resendAt={resendAt}
          pending={resendPending}
          onResend={() => {
            setCode("")
            onResend()
          }}
        />
        <LoadingButton
          type="submit"
          size="xl"
          className="mt-6 w-full"
          disabled={code.length < 6}
          loading={pending}
        >
          {submitLabel}
        </LoadingButton>
      </div>
    </form>
  )
}

function EmailVerifyStep({
  email,
  resendAt,
  onResent,
  onSuccess,
}: {
  email: string
  resendAt: number
  onResent: (seconds?: number) => void
  onSuccess: (data: { setupToken: string; firstName: string }) => void
}) {
  const verify = useVerifyEmail()
  const resend = useResendEmailCode()

  return (
    <CodeForm
      title="Please check your email"
      email={email}
      submitLabel="Verify email"
      pending={verify.isPending}
      resendAt={resendAt}
      resendPending={resend.isPending}
      onResend={() =>
        resend.mutate(email, {
          onSuccess: (data) => onResent(data.resendAvailableInSeconds),
        })
      }
      onSubmit={(code, reset) =>
        verify.mutate(
          { email, code },
          {
            onSuccess: (data) =>
              onSuccess({
                setupToken: data.setupToken,
                firstName: data.user.firstName,
              }),
            onError: reset,
          }
        )
      }
    />
  )
}

/* ----------------------------- Create password ---------------------------- */

function CreatePasswordStep({
  setupToken,
  onExpired,
  onSuccess,
}: {
  setupToken: string | null
  onExpired: () => void
  onSuccess: (firstName: string) => void
}) {
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const setPasswordMutation = useSetPassword()
  const mismatch = confirm !== "" && confirm !== password
  const valid = isStrongPassword(password) && password === confirm

  return (
    <form
      className="pb-6"
      onSubmit={(event) => {
        event.preventDefault()
        if (!setupToken) return onExpired()
        setPasswordMutation.mutate(
          { setupToken, password, confirmPassword: confirm },
          {
            onSuccess: (auth) => onSuccess(auth.user.firstName),
            // Setup token expired (15 min): verify the email again.
            onError: (error) => {
              if (toApiError(error).status === 401) onExpired()
            },
          }
        )
      }}
    >
      <StepHeader
        title="Create a password"
        description="Choose a strong password to secure your account"
      />

      <div className="mt-6 space-y-4 px-6">
        <div className="space-y-2">
          <Label htmlFor="setup-password">Password</Label>
          <PasswordInput
            id="setup-password"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
            describedBy="setup-password-rules"
          />
          <PasswordRequirements password={password} className="pt-1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="setup-confirm">Confirm password</Label>
          <PasswordInput
            id="setup-confirm"
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
          loading={setPasswordMutation.isPending}
        >
          Create account
        </LoadingButton>
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

/* ----------------------------- Forgot password ---------------------------- */

function ForgotEmailStep({
  defaultEmail,
  onBack,
  onSuccess,
}: {
  defaultEmail: string
  onBack: () => void
  onSuccess: (email: string) => void
}) {
  const [email, setEmail] = React.useState(defaultEmail)
  const forgot = useForgotPassword()

  return (
    <form
      className="pb-6"
      onSubmit={(event) => {
        event.preventDefault()
        const value = email.trim()
        forgot.mutate(value, { onSuccess: () => onSuccess(value) })
      }}
    >
      <StepHeader
        title="Forgot password?"
        description="Enter your email and we’ll send you a reset code"
      />
      <div className="mt-6 space-y-2 px-6">
        <Label htmlFor="forgot-email">Email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
        />
      </div>
      <ModalDivider />
      <div className="px-6">
        <LoadingButton
          type="submit"
          size="xl"
          className="w-full"
          loading={forgot.isPending}
        >
          Send reset code
        </LoadingButton>
        <FooterPrompt
          prompt="Remembered it?"
          action="Back to login"
          onAction={onBack}
        />
      </div>
    </form>
  )
}

function ResetVerifyStep({
  email,
  resendAt,
  onResent,
  onSuccess,
}: {
  email: string
  resendAt: number
  onResent: (seconds?: number) => void
  onSuccess: () => void
}) {
  const verify = useVerifyResetCode()
  // Re-requesting a reset code is the "resend" for this flow.
  const resend = useForgotPassword()

  return (
    <CodeForm
      title="Enter your reset code"
      email={email}
      submitLabel="Verify code"
      pending={verify.isPending}
      resendAt={resendAt}
      resendPending={resend.isPending}
      onResend={() => resend.mutate(email, { onSuccess: () => onResent() })}
      onSubmit={(code, reset) =>
        verify.mutate({ email, code }, { onSuccess, onError: reset })
      }
    />
  )
}

function ResetPasswordStep({
  email,
  onSuccess,
}: {
  email: string
  onSuccess: () => void
}) {
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const reset = useResetPassword()
  const mismatch = confirm !== "" && confirm !== password
  const valid = isStrongPassword(password) && password === confirm

  return (
    <form
      className="pb-6"
      onSubmit={(event) => {
        event.preventDefault()
        reset.mutate({ email, newPassword: password }, { onSuccess })
      }}
    >
      <StepHeader title="Set a new password" description={`For ${email}`} />
      <div className="mt-6 space-y-4 px-6">
        <div className="space-y-2">
          <Label htmlFor="reset-password">New password</Label>
          <PasswordInput
            id="reset-password"
            name="newPassword"
            autoComplete="new-password"
            value={password}
            onChange={setPassword}
          />
          <PasswordRequirements password={password} className="pt-1" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reset-confirm">Confirm new password</Label>
          <PasswordInput
            id="reset-confirm"
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
          loading={reset.isPending}
        >
          Reset password
        </LoadingButton>
      </div>
    </form>
  )
}
