import { useEffect, useRef, useState } from "react"
import { Check, Copy, Ticket } from "@phosphor-icons/react"
import { isOfferExpired, localIsoDate } from "@/domain/types"
import { cn } from "@/lib/utils"

type Props = {
  offer?: string
  offerCode?: string
  offerExpiresOn?: string
  /** `feature` is the large, high-contrast card on the sticker page. */
  variant?: "compact" | "feature"
  className?: string
}

function formatEndDate(isoDate: string): string {
  if (isoDate === localIsoDate()) return "today"
  const [y, m, d] = isoDate.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  })
}

export function StickerPromo({
  offer,
  offerCode,
  offerExpiresOn,
  variant = "compact",
  className,
}: Props) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  if (!offer || isOfferExpired(offerExpiresOn)) return null

  async function copyCode() {
    if (!offerCode) return
    try {
      await navigator.clipboard.writeText(offerCode)
      setCopied(true)
      window.clearTimeout(resetTimer.current)
      resetTimer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked (insecure context / permissions): code stays visible to copy by hand.
    }
  }

  if (variant === "feature") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-[18px] bg-gradient-to-br from-[#ff8a3d] via-[#ff4d6d] to-[#d63384] py-3 pr-3 pl-4 text-white shadow-[0_12px_30px_-18px_rgba(255,77,109,0.8)]",
          className
        )}
      >
        <Ticket weight="fill" aria-hidden className="size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[16px] leading-tight font-semibold tracking-[-0.02em] break-words">
            {offer}
          </p>
          {offerExpiresOn ? (
            <p className="mt-0.5 text-[12px] text-white/80">
              Ends {formatEndDate(offerExpiresOn)}
            </p>
          ) : null}
        </div>
        {offerCode ? (
          <button
            type="button"
            onClick={() => void copyCode()}
            aria-label={`Copy code ${offerCode}`}
            className="press inline-flex h-10 max-w-[55%] shrink-0 items-center gap-2 rounded-[12px] border border-dashed border-white/60 bg-white/15 pr-1.5 pl-3 transition-colors hover:bg-white/25"
          >
            <span className="truncate font-mono text-[14px] font-semibold tracking-[0.1em]">
              {offerCode}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-[8px] bg-white px-2 py-1 text-[12px] font-semibold text-[#d63384]">
              {copied ? (
                <>
                  <Check weight="bold" className="size-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy weight="bold" className="size-3" />
                  Copy
                </>
              )}
            </span>
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-[16px] border border-dashed border-black/[0.14] bg-[#f5f5f7] px-3.5 py-2.5",
        className
      )}
    >
      <Ticket weight="fill" className="size-4 shrink-0 text-neutral-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug font-medium tracking-[-0.01em] text-neutral-700">
          {offer}
        </p>
        {offerExpiresOn ? (
          <p className="mt-0.5 text-[11px] text-neutral-500">
            Ends {formatEndDate(offerExpiresOn)}
          </p>
        ) : null}
      </div>
      {offerCode ? (
        <button
          type="button"
          onClick={() => void copyCode()}
          aria-label={`Copy code ${offerCode}`}
          className="press inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 font-mono text-[12px] font-semibold tracking-wide text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06] transition-colors hover:bg-neutral-50"
        >
          {offerCode}
          {copied ? (
            <Check weight="bold" className="size-3.5 text-emerald-600" />
          ) : (
            <Copy weight="bold" className="size-3.5 text-neutral-400" />
          )}
        </button>
      ) : null}
    </div>
  )
}
