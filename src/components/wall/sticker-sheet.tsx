import type { Ref } from "react"
import { ArrowUpRight, X } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import type { Placement, Sticker } from "@/domain/types"
import { CategoryTag } from "@/components/category-icon"
import { StickerPromo } from "@/components/sticker-promo"

type Props = {
  sticker: Sticker
  placement: Placement
  onClose: () => void
  ref?: Ref<HTMLElement>
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/**
 * Card for the selected sticker. Docks at the bottom on phones and to the
 * bottom-right on wider screens; fit-to-screen keeps the sticker clear of it.
 */
export function StickerSheet({ sticker, placement, onClose, ref }: Props) {
  return (
    <aside
      ref={ref}
      key={placement.id}
      aria-label={sticker.name}
      className="pointer-events-auto absolute right-3 bottom-[max(12px,env(safe-area-inset-bottom))] left-3 z-30 animate-in rounded-[28px] bg-white/90 p-3 font-ui shadow-[0_24px_60px_-20px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(0,0,0,0.06)] backdrop-blur-2xl backdrop-saturate-150 duration-300 fade-in slide-in-from-bottom-3 sm:right-4 sm:bottom-4 sm:left-auto sm:w-[360px]"
    >
      <div className="flex items-start gap-3 p-1">
        <img
          src={sticker.imageDataUrl}
          alt=""
          className="size-14 shrink-0 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.16)]"
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <CategoryTag
            category={sticker.category}
            className="max-w-full text-[12px] font-semibold tracking-[-0.01em]"
            iconClassName="size-3"
          />
          <h2 className="mt-0.5 line-clamp-2 text-[19px] leading-tight font-semibold tracking-[-0.025em] break-words text-neutral-900">
            {sticker.name}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="press -mt-0.5 -mr-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-black/[0.05] text-neutral-600 transition-colors hover:bg-black/[0.08] hover:text-neutral-900"
        >
          <X weight="bold" className="size-3.5" />
        </button>
      </div>

      {sticker.oneLiner ? (
        <p className="mt-1.5 line-clamp-2 px-1 text-[14px] leading-snug tracking-[-0.01em] break-words text-neutral-500">
          {sticker.oneLiner}
        </p>
      ) : null}

      <StickerPromo
        variant="feature"
        offer={sticker.offer}
        offerCode={sticker.offerCode}
        offerExpiresOn={sticker.offerExpiresOn}
        className="mt-3"
      />

      <div className="mt-3 flex gap-2">
        <a
          href={sticker.url}
          target="_blank"
          rel="noreferrer"
          className="press inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-neutral-900 px-4 text-[15px] font-semibold tracking-[-0.01em] text-white transition-opacity hover:opacity-90"
        >
          <span className="truncate">Visit {hostname(sticker.url)}</span>
          <ArrowUpRight weight="bold" className="size-3.5 shrink-0" />
        </a>
        <Link
          to="/stickers/$slug"
          params={{ slug: sticker.slug }}
          className="press inline-flex h-11 shrink-0 items-center rounded-full bg-black/[0.05] px-4 text-[15px] font-semibold tracking-[-0.01em] text-neutral-900 transition-colors hover:bg-black/[0.08]"
        >
          Details
        </Link>
      </div>
    </aside>
  )
}
