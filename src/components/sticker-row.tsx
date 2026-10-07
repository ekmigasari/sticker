import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Sticker as StickerIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

type Props = {
  slug: string
  name: string
  oneLiner: string
  url: string
  imageSrc?: string
  /** Rendered before the thumbnail, e.g. a rank badge. */
  leading?: React.ReactNode
  /** Small line under the one-liner. */
  meta?: React.ReactNode
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
  leading,
  meta,
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
      {leading ? (
        <div className="pointer-events-none shrink-0">{leading}</div>
      ) : null}
      <div className="pointer-events-none my-3 grid size-14 shrink-0 place-items-center overflow-hidden rounded-[14px] bg-[#f5f5f7] p-2 ring-1 ring-black/[0.05] transition-colors duration-200 ring-inset group-hover:bg-white sm:size-16 sm:rounded-[16px]">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt=""
            loading="lazy"
            className="size-full object-contain transition-transform duration-300 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <StickerIcon weight="fill" className="size-6 text-neutral-300" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-3 self-stretch border-b border-black/[0.08] py-3 transition-colors duration-200 group-last:border-transparent group-hover:border-transparent">
        <div className="pointer-events-none min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[16px] font-semibold tracking-[-0.02em] text-neutral-900 sm:text-[17px]">
            <span className="truncate">{name}</span>
            <ArrowUpRight
              weight="bold"
              aria-hidden
              className="size-3.5 shrink-0 text-neutral-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
            />
          </p>
          <p className="truncate text-[13px] text-neutral-500 sm:text-[14px]">
            {oneLiner}
          </p>
          {meta ? (
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] font-medium text-neutral-400 tabular-nums">
              {meta}
            </div>
          ) : null}
        </div>
        <Link
          to="/stickers/$slug"
          params={{ slug }}
          className="press relative inline-flex h-8 shrink-0 items-center rounded-full bg-[#f2f2f7] px-4 text-[14px] font-semibold tracking-[-0.01em] text-[#0071e3] transition-colors group-hover:bg-white hover:bg-[#e8e8ed]!"
        >
          Detail
        </Link>
      </div>
    </li>
  )
}
