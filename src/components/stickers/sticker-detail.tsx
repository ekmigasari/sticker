import { useEffect, useMemo, useRef, useState } from "react"
import {
  Link,
  useCanGoBack,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import {
  ArrowUp,
  ArrowUpRight,
  CaretLeft,
  Check,
  Crown,
  Export,
  MapPin,
  MapPinPlus,
  Sticker as StickerIcon,
  Trophy,
} from "@phosphor-icons/react"
import { CategoryTag } from "@/components/category-icon"
import {
  VISIBILITY,
  formatPercent,
  wallStatus,
} from "@/components/stickers/wall-status"
import { PeelToVisit } from "@/components/stickers/peel-to-visit"
import { useIsMobile } from "@/hooks/use-mobile"
import { StickerPromo } from "@/components/sticker-promo"
import { StickerRow } from "@/components/sticker-row"
import {
  PLOT_MIN,
  coveredUnits,
  formatPlot,
  isHoloFinish,
  plotArea,
  plotPrice,
  plotVisibility,
  restoreQuote,
  visibleAreaShare,
  type Category,
  type MoveSpot,
  type Placement,
  type RestoreQuote,
} from "@/domain/types"
import { rankStickers, type StickerRank } from "@/domain/ranking"
import { cn } from "@/lib/utils"
import type { StickerDTO } from "@/lib/sticker-api"
import type { StickerWithPlacements } from "@/lib/stickers"
import { useWallStore } from "@/store/wall-store"

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

/** Fixed locale + UTC so server and client render the same string. */
function formatListedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

type PoolSticker = {
  id: string
  slug: string
  name: string
  oneLiner: string
  url: string
  category: Category
  imageSrc: string
  createdAt: string
  totalSpent: number
}

type BackTarget = { to: "/stickers" | "/dashboard"; label: string }

type Props = {
  sticker: StickerWithPlacements | null
  all: StickerDTO[]
  /** Where Back goes when there's no history to pop. */
  back: BackTarget
  /** Right side of the nav row, e.g. the owner's Edit button. */
  action?: React.ReactNode
  /** Above the artwork, e.g. an archived notice. */
  notice?: React.ReactNode
  /** Owner only: restoring covered plots becomes the page's main action. */
  onRestore?: (quote: RestoreQuote) => void
  /** Owner only: pick a new spot and size for a plot. */
  move?: MoveAction
}

type MoveAction = {
  /** Null spot: the sticker has no plot yet, so this buys its first. */
  onMove: (spot: MoveSpot | null) => void
  pending: boolean
  error: string | null
}

export function StickerDetail({
  sticker: dbSticker,
  all,
  back,
  action,
  notice,
  onRestore,
  move,
}: Props) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const focusPlacement = useWallStore((s) => s.focusPlacement)
  const heroRef = useRef<HTMLButtonElement>(null)

  const stickerKey = dbSticker?.id
  const wallItems = useMemo(
    () =>
      (dbSticker?.placements ?? []).map((placement) => ({
        placement,
        visible: placement.visibleShare ?? 1,
        coveredBy: placement.coveredBy ?? 0,
      })),
    [dbSticker]
  )

  const pool = useMemo(
    () =>
      all.map((s): PoolSticker => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        oneLiner: s.oneLiner,
        url: s.url,
        category: s.category,
        imageSrc: s.imageUrl,
        createdAt: s.createdAt,
        totalSpent: s.totalSpent,
      })),
    [all]
  )

  const ranks = useMemo(() => rankStickers(pool), [pool])
  const category = dbSticker?.category
  const related = useMemo(() => {
    const order = (id: string) =>
      ranks.get(id)?.overall ?? Number.MAX_SAFE_INTEGER
    return pool
      .filter((s) => s.id !== stickerKey && s.category === category)
      .sort(
        (a, b) =>
          order(a.id) - order(b.id) || b.createdAt.localeCompare(a.createdAt)
      )
      .slice(0, 6)
  }, [pool, ranks, stickerKey, category])

  if (!dbSticker) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <div className="grid size-20 place-items-center rounded-[24px] bg-[#f5f5f7] text-neutral-400">
          <StickerIcon weight="fill" className="size-9" />
        </div>
        <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.03em] text-neutral-900">
          Sticker not found
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-neutral-500">
          It may have been renamed or removed.
        </p>
        <Link
          to={back.to}
          className="press mt-7 inline-flex h-11 items-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold tracking-[-0.01em] text-white"
        >
          Back to {back.label}
        </Link>
      </div>
    )
  }

  const sticker = dbSticker
  const domain = hostname(sticker.url)
  const plots = wallItems.map(({ placement, visible }) => ({
    id: placement.id,
    unitsW: placement.unitsW,
    unitsH: placement.unitsH,
    visibleShare: visible,
  }))
  const summary = summarizeWall(plots)
  const quote = onRestore ? restoreQuote(plots) : null
  /** With several plots, each card carries its own Move instead. */
  const heroSpot = wallItems.length === 1 ? wallItems[0].placement : null

  function viewOnWall(placement: Placement) {
    focusPlacement(placement)
    void navigate({ to: "/" })
  }

  return (
    <article className="mx-auto max-w-3xl px-4 pt-2 sm:px-8 sm:pt-6">
      <div className="flex items-center justify-between gap-3">
        <BackButton fallback={back} />
        {action}
      </div>
      {notice}
      <div className="mt-2 flex h-80 flex-col items-center justify-center sm:h-[420px]">
        {sticker.imageUrl ? (
          <PeelToVisit
            src={sticker.imageUrl}
            name={sticker.name}
            url={sticker.url}
            holo={isHoloFinish(sticker.finish)}
            displayPx={isMobile ? 224 : 288}
          />
        ) : (
          <StickerIcon weight="fill" className="size-20 text-neutral-300" />
        )}
      </div>

      <header className="mt-7">
        <Link
          to="/stickers"
          search={{ category: sticker.category }}
          className="inline-flex max-w-full text-[13px] font-semibold tracking-[-0.01em] uppercase hover:opacity-80"
        >
          <CategoryTag category={sticker.category} iconClassName="size-4" />
        </Link>
        <h1 className="mt-1.5 text-[34px] leading-[1.05] font-semibold tracking-[-0.035em] break-words text-neutral-900 sm:text-[40px]">
          {sticker.name}
        </h1>
        {sticker.oneLiner ? (
          <p className="mt-2.5 text-[17px] leading-snug tracking-[-0.01em] break-words text-neutral-500">
            {sticker.oneLiner}
          </p>
        ) : null}
      </header>

      {onRestore ? <WallStatusLine summary={summary} /> : null}
      <div
        className={cn("flex items-center gap-2.5", onRestore ? "mt-3" : "mt-6")}
      >
        {quote && onRestore ? (
          <RestoreButton
            ref={heroRef}
            quote={quote}
            onClick={() => onRestore(quote)}
            className="h-12 flex-1 text-[16px]"
          />
        ) : (
          <a
            href={sticker.url}
            target="_blank"
            rel="noreferrer"
            className="press inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-neutral-900 px-5 text-[16px] font-semibold tracking-[-0.01em] text-white"
          >
            <span className="truncate">Visit website</span>
            <ArrowUpRight weight="bold" className="size-4 shrink-0" />
          </a>
        )}
        {move && (heroSpot || !wallItems.length) ? (
          <NewSpotButton
            first={!heroSpot}
            pending={move.pending}
            onClick={() => move.onMove(heroSpot)}
            className="h-12 px-4 text-[16px]"
          />
        ) : null}
        <ShareButton
          title={sticker.name}
          text={sticker.oneLiner}
          path={`/stickers/${sticker.slug}`}
        />
      </div>
      {move?.error ? (
        <p role="alert" className="mt-2 text-[13px] font-medium text-[#ff3b30]">
          {move.error}
        </p>
      ) : null}

      <RankStrip
        rank={stickerKey ? ranks.get(stickerKey) : undefined}
        category={sticker.category}
      />

      <StickerPromo
        offer={sticker.offer}
        offerCode={sticker.offerCode}
        offerExpiresOn={sticker.offerExpiresOn}
        variant="feature"
        className="mt-4"
      />

      {sticker.description ? (
        <Section title="About">
          <p className="text-[16px] leading-relaxed tracking-[-0.01em] break-words whitespace-pre-line text-neutral-600">
            {sticker.description}
          </p>
        </Section>
      ) : null}

      <Section title="On the wall">
        {wallItems.length ? (
          <ul className="space-y-2.5">
            {wallItems.map((item, i) => {
              const plotQuote = onRestore ? restoreQuote([plots[i]]) : null
              return (
                <WallPlacementCard
                  key={item.placement.id}
                  placement={item.placement}
                  visible={item.visible}
                  coveredBy={item.coveredBy}
                  onView={() => viewOnWall(item.placement)}
                  restorePrice={plotQuote?.price}
                  onRestore={
                    plotQuote && onRestore
                      ? () => onRestore(plotQuote)
                      : undefined
                  }
                  move={
                    move
                      ? {
                          onClick: () => move.onMove(item.placement),
                          pending: move.pending,
                        }
                      : undefined
                  }
                />
              )
            })}
          </ul>
        ) : (
          <div className="flex items-center gap-3 rounded-[20px] bg-[#f5f5f7] p-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-neutral-400">
              <MapPin weight="fill" className="size-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-medium tracking-[-0.01em] text-neutral-900">
                Not on the wall yet
              </p>
              <p className="mt-0.5 text-[13px] text-neutral-500">
                {move
                  ? `Pick a spot and size. Plots start at $${plotPrice(PLOT_MIN, PLOT_MIN)}.`
                  : "Once placed, you'll see how much of it is still visible."}
              </p>
            </div>
            {move ? (
              <button
                type="button"
                disabled={move.pending}
                onClick={() => move.onMove(null)}
                className={cardButton}
              >
                <MapPinPlus weight="bold" className="size-3.5" />
                Place
              </button>
            ) : null}
          </div>
        )}
      </Section>

      <Section title="Information">
        <dl className="divide-y divide-black/[0.06] rounded-[20px] bg-[#f5f5f7] px-4 text-[15px] tracking-[-0.01em]">
          <InfoRow label="Category">{sticker.category}</InfoRow>
          <InfoRow label="Website">
            <a
              href={sticker.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-[#0071e3] hover:underline"
            >
              <span className="truncate">{domain}</span>
              <ArrowUpRight weight="bold" className="size-3.5 shrink-0" />
            </a>
          </InfoRow>
          <InfoRow label="Listed">
            {formatListedDate(sticker.createdAt)}
          </InfoRow>
          <InfoRow label="Placements">{wallItems.length}</InfoRow>
          <InfoRow label="Spent on the wall">
            ${sticker.totalSpent.toLocaleString("en-US")}
          </InfoRow>
        </dl>
      </Section>

      <Section
        title={`More in ${sticker.category}`}
        action={
          <Link
            to="/stickers"
            search={{ category: sticker.category }}
            className="text-[15px] tracking-[-0.01em] text-[#0071e3] hover:underline"
          >
            See all
          </Link>
        }
      >
        {related.length ? (
          <ul>
            {related.map((s) => {
              const rank = ranks.get(s.id)
              return (
                <StickerRow
                  key={s.id}
                  slug={s.slug}
                  name={s.name}
                  oneLiner={s.oneLiner}
                  url={s.url}
                  imageSrc={s.imageSrc}
                  meta={
                    <>
                      <CategoryTag category={s.category} />
                      {rank ? (
                        <span className="shrink-0">
                          · #{rank.category} in category
                        </span>
                      ) : null}
                    </>
                  }
                />
              )
            })}
          </ul>
        ) : (
          <p className="rounded-[20px] bg-[#f5f5f7] p-4 text-[14px] leading-snug text-neutral-500">
            No other stickers in {sticker.category} yet. Yours is the first.
          </p>
        )}
      </Section>

      {quote && onRestore ? (
        <>
          {/* Room for the pinned bar so it never hides the last section. */}
          <div aria-hidden className="h-20 sm:hidden" />
          <PinnedRestoreBar
            target={heroRef}
            quote={quote}
            onClick={() => onRestore(quote)}
            summary={summary}
          />
        </>
      ) : null}
    </article>
  )
}

type WallSummary = ReturnType<typeof wallStatus> & { long: string }

/** Measured by area across every plot, so one small visible plot can't hide a big covered one. */
function summarizeWall(
  plots: { unitsW: number; unitsH: number; visibleShare: number }[]
): WallSummary {
  const status = wallStatus(visibleAreaShare(plots))
  if (status.status === "none") {
    return { ...status, long: "Not on the wall yet." }
  }
  if (status.status === "visible") {
    return { ...status, long: "Fully visible on the wall. Nothing on top yet." }
  }
  if (status.status === "hidden") {
    return {
      ...status,
      long: "100% covered. It keeps its spot but isn\u2019t drawn on the wall until you restore or move it.",
    }
  }
  const covered = plots.reduce(
    (sum, p) => sum + coveredUnits(p.unitsW, p.unitsH, p.visibleShare),
    0
  )
  const total = plots.reduce((sum, p) => sum + plotArea(p.unitsW, p.unitsH), 0)
  return {
    ...status,
    long: `${status.label} · ${covered.toLocaleString("en-US")} of ${total.toLocaleString("en-US")} units covered.`,
  }
}

function WallStatusLine({ summary }: { summary: WallSummary }) {
  return (
    <p className="mt-6 flex items-start gap-2 text-[14px] leading-snug tracking-[-0.01em] text-neutral-600">
      <span
        aria-hidden
        className={cn("mt-[5px] size-2 shrink-0 rounded-full", summary.dot)}
      />
      {summary.long}
    </p>
  )
}

function RestoreButton({
  ref,
  quote,
  onClick,
  className,
}: {
  ref?: React.Ref<HTMLButtonElement>
  quote: RestoreQuote
  onClick: () => void
  className?: string
}) {
  const spots = quote.placementIds.length
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className={cn(
        "press inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-neutral-900 px-5 font-semibold tracking-[-0.01em] text-white",
        className
      )}
    >
      <ArrowUp weight="bold" className="size-[18px] shrink-0" />
      <span className="truncate">
        {spots === 1 ? (
          <>
            Restore<span className="max-sm:hidden"> to top</span>
          </>
        ) : (
          `Restore ${spots} spots`
        )}
      </span>
      <span className="shrink-0 font-medium text-white/60 tabular-nums">
        ${quote.price.toLocaleString("en-US")}
      </span>
    </button>
  )
}

const NEW_SPOT_HINT = "Buy a new spot at any size. The old spot is removed."

function NewSpotButton({
  onClick,
  pending,
  first,
  className,
}: {
  onClick: () => void
  pending: boolean
  /** No plot yet, so this buys its first rather than replacing one. */
  first: boolean
  className?: string
}) {
  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      title={first ? undefined : NEW_SPOT_HINT}
      className={cn(
        "press inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-black/[0.06] font-semibold tracking-[-0.01em] text-neutral-900 transition-colors hover:bg-black/[0.09] disabled:opacity-60",
        className
      )}
    >
      <MapPinPlus weight="bold" className="size-4 shrink-0" />
      {pending ? "Loading…" : first ? "Place on wall" : "New spot"}
    </button>
  )
}

/** Phones: keeps Restore in reach once the main button scrolls away. */
function PinnedRestoreBar({
  target,
  quote,
  onClick,
  summary,
}: {
  target: React.RefObject<HTMLElement | null>
  quote: RestoreQuote
  onClick: () => void
  summary: WallSummary
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const el = target.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) =>
      setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0)
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target])

  return (
    <div
      data-ui-chrome
      inert={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(12px,env(safe-area-inset-bottom))] transition-[translate,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none sm:hidden",
        show
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-full opacity-0"
      )}
    >
      <div className="flex items-center gap-3 rounded-full border border-white/70 bg-white/80 py-1.5 pr-1.5 pl-4 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(0,0,0,0.08)] backdrop-blur-2xl backdrop-saturate-[1.8]">
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium tracking-[-0.01em] text-neutral-700">
          <span
            aria-hidden
            className={cn("size-2 shrink-0 rounded-full", summary.dot)}
          />
          <span className="truncate">{summary.label}</span>
        </span>
        <RestoreButton
          quote={quote}
          onClick={onClick}
          className="ml-auto h-11 shrink-0 px-4 text-[15px]"
        />
      </div>
    </div>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="min-w-0 text-[22px] font-semibold tracking-[-0.025em] text-neutral-900">
          {title}
        </h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  )
}

const TOP_RANK = 10

function RankStrip({
  rank,
  category,
}: {
  rank: StickerRank | undefined
  category: Category
}) {
  const cells = [
    {
      label: "Overall",
      value: rank?.overall,
      of: rank?.overallOf,
      search: {},
    },
    {
      label: category,
      value: rank?.category,
      of: rank?.categoryOf,
      search: { category },
    },
  ]
  return (
    <div className="mt-5 grid grid-cols-2 divide-x divide-black/[0.08] border-y border-black/[0.08] py-3.5">
      {cells.map((cell) => {
        const top = cell.value != null && cell.value <= TOP_RANK
        const first = cell.value === 1
        const Icon = first ? Crown : Trophy
        return (
          <div key={cell.label} className="min-w-0 px-3 text-center">
            <p className="truncate text-[11px] font-semibold tracking-[0.02em] text-neutral-500 uppercase">
              {cell.label}
            </p>
            <p
              className={cn(
                "mt-1 inline-flex items-center gap-1 text-[24px] leading-none font-semibold tracking-[-0.03em] tabular-nums",
                top
                  ? "bg-gradient-to-b from-[#f7b500] to-[#e07800] bg-clip-text text-transparent"
                  : "text-neutral-900"
              )}
            >
              {top ? (
                <Icon
                  weight="fill"
                  aria-hidden
                  className="size-5 text-[#f0a000]"
                />
              ) : null}
              {cell.value ? `#${cell.value}` : "—"}
            </p>
            {top ? (
              <p className="mt-1.5 flex justify-center">
                <span className="rounded-full bg-[#fff4d6] px-2 py-0.5 text-[11px] font-semibold text-[#a15c00]">
                  {first ? "Top spot" : `Top ${TOP_RANK}`} · of {cell.of}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-[12px] text-neutral-500">
                {cell.value ? `of ${cell.of} on the wall` : "Not ranked yet"}
              </p>
            )}
            <Link
              to="/stickers"
              search={cell.search}
              className="mt-1.5 inline-flex h-7 items-center text-[13px] font-medium tracking-[-0.01em] text-[#0071e3] hover:underline"
            >
              See more
            </Link>
          </div>
        )
      })}
    </div>
  )
}

function BackButton({ fallback }: { fallback: BackTarget }) {
  const router = useRouter()
  const canGoBack = useCanGoBack()
  const className =
    "press -ml-2 inline-flex h-9 items-center gap-0.5 rounded-full pr-3 pl-1.5 text-[16px] tracking-[-0.01em] text-[#0071e3] transition-colors hover:bg-[#0071e3]/[0.06]"

  if (canGoBack) {
    return (
      <button
        type="button"
        onClick={() => router.history.back()}
        className={className}
      >
        <CaretLeft weight="bold" className="size-[18px]" />
        Back
      </button>
    )
  }
  return (
    <Link to={fallback.to} className={className}>
      <CaretLeft weight="bold" className="size-[18px]" />
      {fallback.label}
    </Link>
  )
}

const cardButton =
  "press inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-white px-3.5 text-[14px] font-semibold tracking-[-0.01em] text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.06] transition-colors hover:bg-neutral-50 disabled:opacity-60"

function WallPlacementCard({
  placement,
  visible,
  coveredBy,
  onView,
  restorePrice,
  onRestore,
  move,
}: {
  placement: Placement
  visible: number
  coveredBy: number
  onView: () => void
  /** Owner only, on covered plots: put this one back on top. */
  restorePrice?: number
  onRestore?: () => void
  /** Owner only: pick a new spot and size for this plot. */
  move?: { onClick: () => void; pending: boolean }
}) {
  const level = plotVisibility(visible)
  const status = VISIBILITY[level]
  const hidden = 1 - visible
  const gone = level === "hidden"

  return (
    <li className="rounded-[20px] bg-[#f5f5f7] p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[13px] font-medium tracking-[-0.01em] text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <span className={cn("size-2 rounded-full", status.dot)} />
          {status.label}
        </span>
        <span className="text-[13px] text-neutral-500 tabular-nums">
          {formatPlot(placement.unitsW, placement.unitsH)} plot
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="leading-none">
          <span className="text-[34px] font-semibold tracking-[-0.03em] text-neutral-900 tabular-nums">
            {gone ? "100" : formatPercent(visible)}%
          </span>
          <span className="ml-1.5 text-[15px] text-neutral-500">
            {gone ? "covered" : "visible"}
          </span>
        </p>
        <div className="flex shrink-0 gap-2">
          {move ? (
            <button
              type="button"
              disabled={move.pending}
              onClick={move.onClick}
              title={NEW_SPOT_HINT}
              className={cardButton}
            >
              <MapPinPlus weight="bold" className="size-3.5" />
              New spot
            </button>
          ) : null}
          {gone ? null : (
            <button type="button" onClick={onView} className={cardButton}>
              <MapPin weight="fill" className="size-3.5" />
              View
            </button>
          )}
        </div>
      </div>

      <div
        role="meter"
        aria-label="Visible share of plot"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(visible * 100)}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.07]"
      >
        <div
          className={cn(
            "h-full origin-left rounded-full transition-transform duration-300 ease-out",
            status.bar
          )}
          style={{ transform: `scaleX(${visible})` }}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <p className="min-w-0 text-[13px] leading-snug text-neutral-500">
          {gone
            ? "Keeps its spot, but isn\u2019t drawn on the wall"
            : coveredBy
              ? `${formatPercent(hidden)}% under ${coveredBy} newer ${coveredBy === 1 ? "sticker" : "stickers"}`
              : "Nothing placed on top"}
        </p>
        {onRestore && restorePrice ? (
          <button
            type="button"
            onClick={onRestore}
            className="press inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-neutral-900 px-3 text-[13px] font-semibold tracking-[-0.01em] text-white"
          >
            <ArrowUp weight="bold" className="size-3.5" />
            Restore
            <span className="font-medium text-white/60 tabular-nums">
              ${restorePrice.toLocaleString("en-US")}
            </span>
          </button>
        ) : null}
      </div>
    </li>
  )
}

function InfoRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 py-3">
      <dt className="shrink-0 text-neutral-500">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-neutral-900">
        {children}
      </dd>
    </div>
  )
}

/** Always shares the public URL, even from the owner's dashboard view. */
function ShareButton({
  title,
  text,
  path,
}: {
  title: string
  text: string
  path: string
}) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  async function share() {
    const url = new URL(path, window.location.origin).toString()
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch {
        // Dismissed share sheet.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.clearTimeout(resetTimer.current)
      resetTimer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard blocked; the address bar still has the link.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      aria-label={copied ? "Link copied" : "Share"}
      className="press grid size-12 shrink-0 place-items-center rounded-full bg-black/[0.06] text-neutral-900 transition-colors hover:bg-black/[0.09]"
    >
      {copied ? (
        <Check weight="bold" className="size-[18px] text-emerald-600" />
      ) : (
        <Export weight="bold" className="size-[18px]" />
      )}
    </button>
  )
}
