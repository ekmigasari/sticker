import { useEffect, useMemo, useRef, useState } from "react"
import {
  createFileRoute,
  Link,
  redirect,
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
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerPromo } from "@/components/sticker-promo"
import { StickerRow } from "@/components/sticker-row"
import {
  formatPlot,
  plotCoverage,
  plotVisibility,
  type Category,
  type Placement,
  type PlotVisibility,
} from "@/domain/types"
import { rankStickers, type StickerRank } from "@/domain/ranking"
import { cn } from "@/lib/utils"
import { getPublicSticker, listPublicStickers } from "@/lib/stickers"
import { useWallStore } from "@/store/wall-store"

export const Route = createFileRoute("/stickers/$slug")({
  loader: async ({ params }) => {
    const [sticker, all] = await Promise.all([
      getPublicSticker({ data: params.slug }),
      listPublicStickers(),
    ])
    if (sticker && sticker.slug !== params.slug) {
      throw redirect({
        to: "/stickers/$slug",
        params: { slug: sticker.slug },
      })
    }
    return { sticker, all }
  },
  component: StickerPage,
})

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

function StickerPage() {
  const { slug } = Route.useParams()
  const { sticker: dbSticker, all } = Route.useLoaderData()
  const navigate = useNavigate()
  const hydrate = useWallStore((s) => s.hydrate)
  const hydrated = useWallStore((s) => s.hydrated)
  const stickers = useWallStore((s) => s.stickers)
  const allPlacements = useWallStore((s) => s.placements)
  const focusPlacement = useWallStore((s) => s.focusPlacement)

  const localSticker = useMemo(
    () => stickers.find((s) => s.slug === slug || s.id === slug),
    [stickers, slug]
  )
  const stickerKey = dbSticker?.id ?? localSticker?.id ?? slug
  const wallItems = useMemo(
    () =>
      allPlacements
        .filter((p) => p.stickerId === stickerKey)
        .sort((a, b) => b.zIndex - a.zIndex)
        .map((placement) => ({
          placement,
          ...plotCoverage(placement, allPlacements),
        })),
    [allPlacements, stickerKey]
  )

  const pool = useMemo(() => {
    const byId = new Map<string, PoolSticker>()
    for (const s of all) {
      byId.set(s.id, {
        id: s.id,
        slug: s.slug,
        name: s.name,
        oneLiner: s.oneLiner,
        url: s.url,
        category: s.category,
        imageSrc: s.imageUrl,
        createdAt: s.createdAt,
        totalSpent: s.totalSpent,
      })
    }
    for (const s of stickers) {
      if (byId.has(s.id)) continue
      byId.set(s.id, {
        id: s.id,
        slug: s.slug,
        name: s.name,
        oneLiner: s.oneLiner,
        url: s.url,
        category: s.category,
        imageSrc: s.imageDataUrl,
        createdAt: s.createdAt,
        totalSpent: 0,
      })
    }
    return [...byId.values()]
  }, [all, stickers])

  const ranks = useMemo(() => rankStickers(pool), [pool])
  const category = dbSticker?.category ?? localSticker?.category
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

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!dbSticker && !hydrated) {
    return (
      <AppChrome>
        <div className="mx-auto max-w-3xl px-4 pt-2 sm:px-8 sm:pt-6">
          <div className="h-9" />
          <div className="mt-2 h-80 w-full animate-pulse rounded-[32px] bg-[#f5f5f7] sm:h-[420px]" />
        </div>
      </AppChrome>
    )
  }

  const sticker = dbSticker
    ? {
        name: dbSticker.name,
        oneLiner: dbSticker.oneLiner,
        url: dbSticker.url,
        category: dbSticker.category,
        description: dbSticker.description,
        offer: dbSticker.offer,
        offerCode: dbSticker.offerCode,
        offerExpiresOn: dbSticker.offerExpiresOn,
        imageSrc: dbSticker.imageUrl,
        createdAt: dbSticker.createdAt,
      }
    : localSticker
      ? {
          name: localSticker.name,
          oneLiner: localSticker.oneLiner,
          url: localSticker.url,
          category: localSticker.category,
          description: localSticker.description,
          offer: localSticker.offer,
          offerCode: localSticker.offerCode,
          offerExpiresOn: localSticker.offerExpiresOn,
          imageSrc: localSticker.imageDataUrl,
          createdAt: localSticker.createdAt,
        }
      : null

  if (!sticker) {
    return (
      <AppChrome>
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
            to="/stickers"
            className="press mt-7 inline-flex h-11 items-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold tracking-[-0.01em] text-white"
          >
            Browse stickers
          </Link>
        </div>
      </AppChrome>
    )
  }

  const domain = hostname(sticker.url)

  function viewOnWall(placement: Placement) {
    focusPlacement(placement, 2.6)
    void navigate({ to: "/" })
  }

  return (
    <AppChrome>
      <article className="mx-auto max-w-3xl px-4 pt-2 sm:px-8 sm:pt-6">
        <BackButton />
        <div className="mt-2 flex h-80 flex-col items-center justify-center sm:h-[420px]">
          {sticker.imageSrc ? (
            <PeelToVisit
              src={sticker.imageSrc}
              name={sticker.name}
              url={sticker.url}
              holo={
                dbSticker?.filter === "glitter" ||
                dbSticker?.filter === "hologram"
              }
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
          <ShareButton title={sticker.name} text={sticker.oneLiner} />
        </div>

        <RankStrip rank={ranks.get(stickerKey)} category={sticker.category} />

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
              ${(dbSticker?.totalSpent ?? 0).toLocaleString("en-US")}
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
    </AppChrome>
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

function BackButton() {
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
    <Link to="/stickers" className={className}>
      <CaretLeft weight="bold" className="size-[18px]" />
      Stickers
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
        <button
          type="button"
          onClick={onView}
          className="press inline-flex h-9 shrink-0 items-center gap-1 rounded-full bg-white px-3.5 text-[14px] font-semibold tracking-[-0.01em] text-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.06] transition-colors hover:bg-neutral-50"
        >
          <MapPin weight="fill" className="size-3.5" />
          View
        </button>
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

function ShareButton({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false)
  const resetTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(resetTimer.current), [])

  async function share() {
    const url = window.location.href
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
