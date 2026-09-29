import { ArrowSquareOut, X } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import type { Placement, Sticker } from "@/domain/types"

type Props = {
  sticker: Sticker
  placement: Placement
  onClose: () => void
}

export function StickerSheet({ sticker, placement, onClose }: Props) {
  return (
    <aside className="font-ui pointer-events-auto absolute right-3 bottom-3 left-3 z-30 max-w-md rounded-[28px] border border-black/[0.06] bg-white/85 p-4 shadow-[0_16px_48px_-16px_rgba(0,0,0,0.22),0_2px_8px_-2px_rgba(0,0,0,0.06)] backdrop-blur-2xl backdrop-saturate-150 sm:right-4 sm:bottom-4 sm:left-auto">
      <div className="flex gap-3">
        <img
          src={sticker.imageDataUrl}
          alt={sticker.name}
          className="size-20 shrink-0 object-contain drop-shadow-md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[12px] font-medium tracking-[-0.01em] text-neutral-500">
                {sticker.category} · {placement.sizeTier}
              </p>
              <h2 className="mt-0.5 text-[20px] font-semibold tracking-[-0.02em] text-neutral-900">
                {sticker.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="press grid size-8 shrink-0 place-items-center rounded-full bg-black/[0.045] text-neutral-900 transition-colors hover:bg-black/[0.07]"
            >
              <X weight="bold" className="size-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-500">
            {sticker.oneLiner}
          </p>
          {sticker.offer ? (
            <p className="mt-2 text-[13px] font-medium tracking-[-0.01em] text-neutral-700">
              {sticker.offer}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={sticker.url}
          target="_blank"
          rel="noreferrer"
          className="press inline-flex h-10 items-center gap-1.5 rounded-full bg-neutral-900 px-4 text-[14px] font-semibold tracking-[-0.01em] text-white"
        >
          Visit
          <ArrowSquareOut weight="bold" className="size-3.5" />
        </a>
        <Link
          to="/sticker/$id"
          params={{ id: sticker.id }}
          className="press inline-flex h-10 items-center rounded-full bg-black/[0.06] px-4 text-[14px] font-semibold tracking-[-0.01em] text-neutral-900 transition-colors hover:bg-black/[0.09]"
        >
          Sticker page
        </Link>
      </div>
    </aside>
  )
}
