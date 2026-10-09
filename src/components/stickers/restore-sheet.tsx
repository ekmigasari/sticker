import { useEffect, useRef, useState } from "react"
import { useNavigate, useRouter } from "@tanstack/react-router"
import {
  ArrowUp,
  CheckCircle,
  MapPin,
  MapPinPlus,
  Trophy,
} from "@phosphor-icons/react"
import { FormSheet } from "@/components/dashboard/form-sheet"
import {
  RESTORE_MIN_PRICE,
  type Category,
  type Placement,
  type RestoreQuote,
} from "@/domain/types"
import {
  PriceChangedError,
  restoreSticker,
  type RankChange,
} from "@/lib/restore"
import { cn } from "@/lib/utils"
import { useWallStore } from "@/store/wall-store"

export type RestoreTarget = {
  sticker: { id: string; name: string; imageUrl: string; category: Category }
  quote: RestoreQuote
}

type Done = { placements: Placement[]; price: number; rank: RankChange | null }

/** Mock checkout delay, matching the place flow. */
const PAY_MS = 900

/** Checkout for putting covered plots back on top at the same spot and size. */
export function RestoreSheet({
  target,
  onOpenChange,
  onMove,
}: {
  target: RestoreTarget | null
  onOpenChange: (open: boolean) => void
  /** The cheaper way out for a big, buried plot: a new spot at any size. */
  onMove?: () => void
}) {
  const router = useRouter()
  const navigate = useNavigate()
  const focusPlacement = useWallStore((s) => s.focusPlacement)
  const restorePlacements = useWallStore((s) => s.restorePlacements)

  // Keep the last target while the sheet animates closed.
  const [shown, setShown] = useState(target)
  const [price, setPrice] = useState(target?.quote.price ?? 0)
  const [repriced, setRepriced] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Done | null>(null)
  if (target && target !== shown) {
    setShown(target)
    setPrice(target.quote.price)
    setRepriced(false)
    setPaying(false)
    setError(null)
    setDone(null)
  }

  const payTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(payTimer.current), [])

  const view = target ?? shown
  if (!view) return null
  const { sticker, quote } = view
  const spots = quote.placementIds.length

  async function pay() {
    setError(null)
    try {
      const result = await restoreSticker({
        stickerId: sticker.id,
        placementIds: quote.placementIds,
        expectedPrice: price,
      })
      restorePlacements(result.placements)
      setDone(result)
      void router.invalidate()
    } catch (err) {
      if (err instanceof PriceChangedError) {
        setPrice(err.price)
        setRepriced(true)
      } else {
        setError(err instanceof Error ? err.message : "Could not restore.")
      }
    } finally {
      setPaying(false)
    }
  }

  function startPay() {
    if (paying) return
    setPaying(true)
    payTimer.current = window.setTimeout(() => void pay(), PAY_MS)
  }

  function viewOnWall() {
    const top = done?.placements[0]
    if (!top) return
    onOpenChange(false)
    focusPlacement(top)
    void navigate({ to: "/" })
  }

  return (
    <FormSheet
      open={target != null}
      onOpenChange={onOpenChange}
      title={done ? "Restored" : "Restore to top"}
    >
      {done ? (
        <div className="flex flex-col items-center pt-2 pb-1 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle weight="fill" className="size-8" />
          </span>
          <h2 className="mt-4 text-[26px] font-semibold tracking-[-0.03em] text-neutral-900">
            Back on top
          </h2>
          <p className="mt-1.5 max-w-xs text-[14px] leading-relaxed text-neutral-500">
            {sticker.name} is fully visible again, in the same spot. Newer
            stickers can still cover it.
          </p>
          {done.rank ? (
            <RankMove
              rank={done.rank}
              category={sticker.category}
              className="mt-4"
            />
          ) : null}
          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={viewOnWall}
              className="nk-btn flex-1"
            >
              <MapPin weight="fill" className="size-4" />
              See it on the wall
            </button>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="nk-btn-secondary flex-1"
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center gap-4">
            <img
              src={sticker.imageUrl}
              alt=""
              className="size-16 shrink-0 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.14)]"
            />
            <div className="min-w-0">
              <p className="truncate text-[17px] font-semibold tracking-[-0.02em] text-neutral-900">
                {sticker.name}
              </p>
              <p className="mt-0.5 text-[13px] text-neutral-500">
                {spots === 1 ? "1 spot" : `${spots} spots`} · same place, same
                size
              </p>
            </div>
          </div>

          <CoveredMeter covered={quote.coveredUnits} total={quote.totalUnits} />

          <dl className="mt-5 divide-y divide-black/[0.06] rounded-[20px] bg-[#f5f5f7] px-4 text-[15px] tracking-[-0.01em]">
            <Row label="Covered units">
              {quote.coveredUnits.toLocaleString("en-US")} × $1
            </Row>
            {price > quote.coveredUnits ? (
              <Row label={`Minimum per spot`}>${RESTORE_MIN_PRICE}</Row>
            ) : null}
            <div className="flex items-center justify-between py-3.5 text-[20px] font-semibold tracking-[-0.02em] text-neutral-900">
              <dt>Total</dt>
              <dd className="tabular-nums">${price.toLocaleString("en-US")}</dd>
            </div>
          </dl>

          <p className="mt-3 text-[13px] leading-snug text-neutral-500">
            You only pay for the covered part. It goes on top of everything and
            adds ${price.toLocaleString("en-US")} to your sticker&apos;s spend
            and rank. Mock payment for this prototype.
          </p>

          {repriced ? (
            <p
              role="status"
              className="mt-3 rounded-[14px] bg-[#fff5e6] px-3.5 py-2.5 text-[13px] leading-snug font-medium text-[#8c6a2f]"
            >
              The wall changed while you were here. The price is now $
              {price.toLocaleString("en-US")}.
            </p>
          ) : null}
          {error ? (
            <p
              role="alert"
              className="mt-3 text-[13px] font-medium text-[#ff3b30]"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={paying}
            onClick={startPay}
            className="nk-btn mt-5 w-full"
          >
            <ArrowUp weight="bold" className="size-4" />
            {paying ? "Processing…" : `Pay $${price.toLocaleString("en-US")}`}
          </button>
          {onMove ? (
            <button
              type="button"
              disabled={paying}
              onClick={onMove}
              className="press mt-2 inline-flex h-11 items-center justify-center gap-1.5 rounded-full text-[15px] font-semibold tracking-[-0.01em] text-[#0071e3] transition-colors hover:bg-[#0071e3]/[0.06] disabled:opacity-60"
            >
              <MapPinPlus weight="bold" className="size-4" />
              Buy a new spot instead
            </button>
          ) : null}
        </div>
      )}
    </FormSheet>
  )
}

function CoveredMeter({ covered, total }: { covered: number; total: number }) {
  const share = total ? Math.min(1, covered / total) : 0
  return (
    <div className="mt-5">
      <div className="flex items-baseline justify-between text-[13px] text-neutral-500 tabular-nums">
        <span>
          <span className="font-semibold text-neutral-900">
            {covered.toLocaleString("en-US")}
          </span>{" "}
          of {total.toLocaleString("en-US")} units covered
        </span>
        <span>{Math.round(share * 100)}%</span>
      </div>
      <div
        role="meter"
        aria-label="Covered share of these spots"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(share * 100)}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#34c759]/25"
      >
        <div
          className="h-full origin-left rounded-full bg-[#ff9f0a]"
          style={{ transform: `scaleX(${share})` }}
        />
      </div>
    </div>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium text-neutral-900 tabular-nums">{children}</dd>
    </div>
  )
}

/** A climb when there was one, else where the sticker stands. */
export function RankMove({
  rank,
  category,
  className,
}: {
  rank: RankChange
  category: Category
  className?: string
}) {
  const { before, after } = rank
  const climbed = before != null && after.category < before.category
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-[#fff4d6] px-3.5 py-1.5 text-[14px] font-semibold tracking-[-0.01em] text-[#a15c00] tabular-nums",
        className
      )}
    >
      {climbed ? (
        <ArrowUp weight="bold" className="size-3.5" />
      ) : (
        <Trophy weight="fill" className="size-3.5" />
      )}
      {climbed
        ? `#${before.category} → #${after.category} in ${category}`
        : `#${after.category} in ${category} · #${after.overall} overall`}
    </p>
  )
}
