"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { WalletCard } from "@/components/destinations/wallet-card"
import type { Wallet } from "@/types/api/wallets"
import { cn } from "@/lib/utils"

/**
 * One row of wallet cards: four fit across on desktop, the rest scroll
 * horizontally (trackpad, shift+wheel, swipe or the arrow buttons).
 */
export function WalletCarousel({ wallets }: { wallets: Wallet[] }) {
  const trackRef = React.useRef<HTMLDivElement>(null)
  const [edges, setEdges] = React.useState({ start: true, end: true })

  const updateEdges = React.useCallback(() => {
    const track = trackRef.current
    if (!track) return
    setEdges({
      start: track.scrollLeft <= 1,
      end: track.scrollLeft + track.clientWidth >= track.scrollWidth - 1,
    })
  }, [])

  React.useEffect(() => {
    const track = trackRef.current
    if (!track) return
    // Re-check when the container resizes or cards are added/removed.
    const observer = new ResizeObserver(updateEdges)
    observer.observe(track)
    return () => observer.disconnect()
  }, [updateEdges, wallets.length])

  const scrollByCard = (direction: 1 | -1) => {
    const track = trackRef.current
    const card = track?.firstElementChild as HTMLElement | null
    if (!track || !card) return
    track.scrollBy({
      left: direction * (card.offsetWidth + 16),
      behavior: "smooth",
    })
  }

  return (
    <div className="relative">
      <div
        ref={trackRef}
        onScroll={updateEdges}
        role="region"
        aria-label="Wallets"
        tabIndex={0}
        className="flex snap-x snap-mandatory [scrollbar-width:thin] gap-4 overflow-x-auto scroll-smooth rounded-[20px] pb-2 outline-none focus-visible:ring-4 focus-visible:ring-brand/15"
      >
        {wallets.map((wallet) => (
          <WalletCard
            key={wallet.id}
            wallet={wallet}
            // Exactly four per row on wide screens, never narrower than 280px.
            className="w-[calc((100%-3rem)/4)] min-w-[280px] shrink-0 snap-start"
          />
        ))}
      </div>

      <ScrollButton
        direction="left"
        hidden={edges.start}
        onClick={() => scrollByCard(-1)}
      />
      <ScrollButton
        direction="right"
        hidden={edges.end}
        onClick={() => scrollByCard(1)}
      />
    </div>
  )
}

function ScrollButton({
  direction,
  hidden,
  onClick,
}: {
  direction: "left" | "right"
  hidden: boolean
  onClick: () => void
}) {
  const Icon = direction === "left" ? ChevronLeftIcon : ChevronRightIcon
  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={-1}
      aria-hidden={hidden}
      aria-label={direction === "left" ? "Previous wallets" : "More wallets"}
      className={cn(
        "absolute top-[calc(50%-4px)] grid size-9 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink shadow-md transition hover:bg-muted",
        direction === "left" ? "-left-2" : "-right-2",
        hidden && "pointer-events-none opacity-0"
      )}
    >
      <Icon className="size-5" strokeWidth={1.75} />
    </button>
  )
}
