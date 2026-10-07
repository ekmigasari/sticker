import { Link } from "@tanstack/react-router"
import {
  ArrowUpRight,
  CaretRight,
  Sticker as StickerIcon,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

type Props = {
  slug: string
  name: string
  oneLiner: string
  url: string
  imageSrc?: string
  /** Rendered before the name, e.g. a rank badge. */
  badge?: React.ReactNode
  /** Small line under the one-liner. */
  meta?: React.ReactNode
  /** Rendered before the Detail button, e.g. total spent. */
  trailing?: React.ReactNode
  className?: string
}

/**
 * The whole row opens the sticker's website; Detail opens its page.
 * Detail sits above the row-wide link so both stay clickable.
 */
export function StickerRow({
  slug,
  name,
  oneLiner,
  url,
  imageSrc,
  badge,
  meta,
  trailing,
  className,
}: Props) {
  return (
    <li
      className={cn(
        "group relative -mx-3 flex items-center gap-3 rounded-[18px] px-3 transition-colors duration-200 hover:bg-[#f5f5f7] sm:gap-4",
        // Hairline separators sit under the text, iOS style; hide the ones touching the hovered row.
        "[&:has(+li:hover)>:last-child]:border-transparent",
        className
      )}
    >
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Visit ${name} website`}
        className="absolute inset-0 rounded-[20px] focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:outline-none"
      />
      <div className="pointer-events-none my-3 flex size-16 shrink-0 items-center justify-center">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            loading="lazy"
            className="max-h-full max-w-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.14)] transition-transform duration-300 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <StickerIcon weight="fill" className="size-6 text-neutral-300" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 self-stretch border-b border-black/[0.08] py-3 transition-colors duration-200 group-last:border-transparent group-hover:border-transparent">
        <div className="pointer-events-none min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[16px] font-semibold tracking-[-0.02em] text-neutral-900 sm:text-[17px]">
            {badge}
            <span className="truncate">{name}</span>
            <ArrowUpRight
              weight="bold"
              aria-hidden
              className="size-3.5 shrink-0 text-neutral-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          </p>
          <p className="line-clamp-2 text-[13px] leading-snug text-neutral-500 sm:truncate sm:text-[14px]">
            {oneLiner}
          </p>
          {meta ? (
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-neutral-400 tabular-nums">
              {meta}
            </div>
          ) : null}
        </div>
        {trailing ? (
          <div className="pointer-events-none shrink-0">{trailing}</div>
        ) : null}
        <Link
          to="/stickers/$slug"
          params={{ slug }}
          aria-label={`${name} details`}
          className="press relative inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f2f2f7] text-[14px] font-semibold tracking-[-0.01em] text-[#0071e3] transition-colors group-hover:bg-white hover:bg-[#e8e8ed]! sm:h-8 sm:w-auto sm:px-4"
        >
          <span className="hidden sm:inline">Detail</span>
          <CaretRight weight="bold" className="size-3.5 sm:hidden" />
        </Link>
      </div>
    </li>
  )
}
