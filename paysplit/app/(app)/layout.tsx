import { AppHeader } from "@/components/app-shell/app-header"
import { AuthGate } from "@/components/auth/auth-gate"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="min-h-svh bg-[#FBFDFF]">
        <AppHeader />
        {children}
      </div>
    </AuthGate>
  )
}
