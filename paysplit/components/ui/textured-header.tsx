import { ModalDescription, ModalTitle } from "@/components/ui/modal"
import { cn } from "@/lib/utils"

/** Modal header with the grey wave texture fading to white (setup & destination modals). */
export function TexturedModalHeader({
  title,
  description,
  className,
}: {
  title: string
  description?: string
  className?: string
}) {
  return (
    <header className={cn("relative shrink-0", className)}>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-24 bg-[url(/images/setup/header-texture.jpg)] bg-cover bg-top"
      >
        <div className="absolute inset-0 bg-linear-to-t from-white from-35% to-white/0" />
      </div>
      <div className="relative px-14 pt-8 text-center short:pt-6">
        <ModalTitle className="text-2xl font-semibold tracking-tight text-[#101828]">
          {title}
        </ModalTitle>
        {description && (
          <ModalDescription className="mt-1.5 text-sm text-[#475467]">
            {description}
          </ModalDescription>
        )}
      </div>
    </header>
  )
}
