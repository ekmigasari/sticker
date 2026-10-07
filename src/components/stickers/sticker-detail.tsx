import { useEffect, useMemo, useRef, useState } from "react"
import {
  Link,
  useCanGoBack,
  useNavigate,
  useRouter,
} from "@tanstack/react-router"
import {
  ArrowUpRight,
  CaretLeft,
  Check,
  Crown,
  Export,
  MapPin,
  Sticker as StickerIcon,
  Trophy,
} from "@phosphor-icons/react"
import { CategoryTag } from "@/components/category-icon"
import { FloatingSticker } from "@/components/make/floating-sticker"
import { useIsMobile } from "@/hooks/use-mobile"
import { StickerPromo } from "@/components/sticker-promo"
import { StickerRow } from "@/components/sticker-row"
import {
  formatPlot,
  plotVisibility,
  type Category,
  type Placement,
  type PlotVisibility,
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

/** Never round a sliver of coverage up to 100% or down to 0%. */
function formatPercent(share: number): string {
  if (share >= 0.999) return "100"
  if (share <= 0.001) return "0"
  const pct = share * 100
  if (pct < 1) return "<1"
  if (pct > 99) return ">99"
  return String(Math.round(pct))
}

const VISIBILITY: Record<
  PlotVisibility,
  { label: string; dot: string; bar: string }
> = {
  visible: { label: "Fully visible", dot: "bg-[#34c759]", bar: "bg-[#34c759]" },
  partly: { label: "Partly covered", dot: "bg-[#ff9f0a]", bar: "bg-[#ff9f0a]" },
  mostly: { label: "Mostly covered", dot: "bg-[#ff453a]", bar: "bg-[#ff453a]" },
  hidden: { label: "Covered", dot: "bg-neutral-400", bar: "bg-neutral-400" },
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
}

export function StickerDetail({
  sticker: dbSticker,
  all,
  back,
  action,
  notice,
}: Props) {
  const navigate = useNavigate()
  const focusPlacement = useWallStore((s) => s.focusPlacement)

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
            holo={sticker.filter === "glitter" || sticker.filter === "hologram"}
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

      <div className="mt-6 flex items-center gap-2.5">
        <a
          href={sticker.url}
          target="_blank"
          rel="noreferrer"
          className="press inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-neutral-900 px-5 text-[16px] font-semibold tracking-[-0.01em] text-white"
        >
          <span className="truncate">Visit website</span>
          <ArrowUpRight weight="bold" className="size-4 shrink-0" />
        </a>
        <ShareButton
          title={sticker.name}
          text={sticker.oneLiner}
          path={`/stickers/${sticker.slug}`}
        />
      </div>

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
            {wallItems.map((item) => (
              <WallPlacementCard
                key={item.placement.id}
                placement={item.placement}
                visible={item.visible}
                coveredBy={item.coveredBy}
                onView={() => viewOnWall(item.placement)}
              />
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-3 rounded-[20px] bg-[#f5f5f7] p-4">
            <div className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-neutral-400">
              <MapPin weight="fill" className="size-[18px]" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-medium tracking-[-0.01em] text-neutral-900">
                Not on the wall yet
              </p>
              <p className="mt-0.5 text-[13px] text-neutral-500">
                Once placed, you'll see how much of it is still visible.
              </p>
            </div>
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
    </article>
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

/** The make-page peel; peeling it all the way off opens the maker's site. */
function PeelToVisit({
  src,
  name,
  url,
  holo,
}: {
  src: string
  name: string
  url: string
  holo: boolean
}) {
  const isMobile = useIsMobile()
  const [session, setSession] = useState(0)

  function visit() {
    // `noopener` in the features string makes window.open return null even on
    // success, so drop the opener by hand to still detect a blocked popup.
    const tab = window.open(url, "_blank")
    if (tab) tab.opener = null
    else window.location.assign(url)
    window.setTimeout(() => setSession((n) => n + 1), 400)
  }

  return (
    <FloatingSticker
      key={session}
      src={src}
      alt={name}
      holo={holo}
      displayPx={isMobile ? 224 : 288}
      appearKey={session}
      onFullyPeeled={visit}
    />
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

function WallPlacementCard({
  placement,
  visible,
  coveredBy,
  onView,
}: {
  placement: Placement
  visible: number
  coveredBy: number
  onView: () => void
}) {
  const status = VISIBILITY[plotVisibility(visible)]
  const hidden = 1 - visible

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
            {formatPercent(visible)}%
          </span>
          <span className="ml-1.5 text-[15px] text-neutral-500">visible</span>
        </p>
        {visible > 0 ? (
          <button
            type="button"
            onClick={onView}
            className="press inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-white px-3.5 text-[14px] font-semibold tracking-[-0.01em] text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.06] transition-colors hover:bg-neutral-50"
          >
            <MapPin weight="fill" className="size-3.5" />
            View
          </button>
        ) : null}
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

      <p className="mt-2.5 text-[13px] leading-snug text-neutral-500">
        {coveredBy
          ? `${formatPercent(hidden)}% under ${coveredBy} newer ${coveredBy === 1 ? "sticker" : "stickers"}`
          : "Nothing placed on top"}
      </p>
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
