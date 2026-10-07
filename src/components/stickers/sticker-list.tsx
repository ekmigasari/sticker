import { useEffect, useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  SquaresFour,
  X,
} from "@phosphor-icons/react"
import {
  CategoryIcon,
  CategoryTag,
  categoryAccent,
} from "@/components/category-icon"
import { glassCapsule } from "@/components/layout/site-nav"
import { StickerRow } from "@/components/sticker-row"
import { CATEGORIES, type Category } from "@/domain/types"
import {
  STICKERS_PAGE_SIZE,
  type StickerListItem,
  type StickerListPage,
} from "@/lib/stickers"
import type { StickersSearch } from "@/lib/stickers-search"
import type { StickerDTO } from "@/lib/sticker-api"
import { cn } from "@/lib/utils"

/** Below this the total reads as an empty room, not a busy wall. */
const HEADLINE_SPEND_MIN = 1_000

const SORTS = [
  { id: "top", label: "Top" },
  { id: "newest", label: "Newest" },
] as const

type Props = {
  data: StickerListPage
  search: StickersSearch
  onSearchChange: (next: Partial<StickersSearch>) => void
}

export function StickerList({ data, search, onSearchChange }: Props) {
  const category = search.category ?? "All"
  const sort = search.sort ?? "top"
  const [query, setQuery] = useState(search.q ?? "")
  const input = useRef<HTMLInputElement>(null)
  const searchRow = useRef<HTMLDivElement>(null)
  const chips = useRef<HTMLDivElement>(null)

  // Center the active chip inside the bar without scrolling the page.
  useEffect(() => {
    const scroller = chips.current
    const chip = scroller?.querySelector<HTMLElement>(
      `[data-category="${category}"]`
    )
    if (!scroller || !chip) return
    scroller.scrollTo({
      left: chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2,
      behavior: "smooth",
    })
  }, [category])

  // Back/forward can change the URL query; don't clobber what's being typed.
  useEffect(() => {
    if (document.activeElement !== input.current) setQuery(search.q ?? "")
  }, [search.q])

  useEffect(() => {
    const next = query.trim()
    if (next === (search.q ?? "")) return
    const timer = window.setTimeout(
      () => onSearchChange({ q: next || undefined }),
      300
    )
    return () => window.clearTimeout(timer)
  }, [query, search.q, onSearchChange])

  /** Once scrolled into the list, go back to its first row instead of the page top. */
  function scrollToList() {
    const row = searchRow.current
    if (!row) return
    const listStart = row.getBoundingClientRect().bottom + window.scrollY - 64
    if (window.scrollY > listStart) window.scrollTo({ top: listStart })
  }

  function change(next: Partial<StickersSearch>) {
    onSearchChange(next)
    scrollToList()
  }

  return (
    <div className="nk-page max-w-3xl">
      <header className="flex flex-col gap-3">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            {data.totalSpent >= HEADLINE_SPEND_MIN ? (
              <p className="mb-1.5 text-[13px] font-semibold tracking-[-0.01em] text-neutral-500 tabular-nums">
                ${data.totalSpent.toLocaleString("en-US")} spent on the wall
              </p>
            ) : null}
            <h1 className="nk-title">Stickers</h1>
          </div>
          <StickerCluster stickers={data.featured} />
        </div>
        <p className="nk-subtitle">
          Every sticker stays listed here — even when it&apos;s buried on the
          wall.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <div ref={searchRow} className="flex items-center gap-2.5">
          <div className="relative min-w-0 flex-1">
            <MagnifyingGlass
              weight="bold"
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-400"
            />
            <input
              ref={input}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stickers"
              aria-label="Search stickers"
              className="nk-field pr-10! pl-11! [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  change({ q: undefined })
                }}
                aria-label="Clear search"
                className="press absolute top-1/2 right-2.5 grid size-7 -translate-y-1/2 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-black/[0.06] hover:text-neutral-700"
              >
                <X weight="bold" className="size-3.5" />
              </button>
            ) : null}
          </div>
          <div
            role="radiogroup"
            aria-label="Sort"
            className="flex h-12 shrink-0 items-center rounded-[14px] bg-[#f5f5f7] p-1"
          >
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={sort === s.id}
                onClick={() =>
                  change({ sort: s.id === "newest" ? "newest" : undefined })
                }
                className={cn(
                  "h-full rounded-[10px] px-3.5 text-[13px] font-medium tracking-[-0.01em] transition-colors",
                  sort === s.id
                    ? "bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
                    : "text-neutral-500 hover:text-neutral-900"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div
          className={cn(
            "sticky top-16 z-30 flex items-center gap-1 rounded-full p-1",
            glassCapsule
          )}
        >
          <div
            ref={chips}
            className="relative no-scrollbar flex min-w-0 flex-1 gap-0.5 overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)] pr-6"
          >
            {(["All", ...CATEGORIES] as const).map((c) => {
              const active = category === c
              return (
                <button
                  key={c}
                  data-category={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    change({ category: c === "All" ? undefined : c })
                  }
                  className={cn(
                    "press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full pr-3.5 pl-3 text-[13px] font-medium tracking-[-0.01em] transition-colors",
                    active
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-600 hover:bg-black/[0.05] hover:text-neutral-900"
                  )}
                >
                  <CategoryIcon
                    category={c}
                    color={active ? undefined : categoryAccent(c)}
                    className="size-3.5"
                  />
                  {c}
                </button>
              )
            })}
          </div>
          <Link
            to="/categories"
            className="press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-black/[0.05] pr-3.5 pl-3 text-[13px] font-medium tracking-[-0.01em] text-neutral-900 transition-colors hover:bg-black/[0.09]"
          >
            <SquaresFour weight="fill" className="size-3.5" />
            Categories
          </Link>
        </div>

        <p className="mt-2 text-[13px] font-medium tracking-[-0.01em] text-neutral-500 tabular-nums">
          {data.total} {data.total === 1 ? "result" : "results"}
          {search.category ? (
            <>
              {" in "}
              <span style={{ color: categoryAccent(search.category) }}>
                {search.category}
              </span>
            </>
          ) : null}
          {search.q ? <> for “{search.q}”</> : null}
        </p>

        {data.items.length ? (
          <ul>
            {data.items.map((sticker) => (
              <ListRow
                key={sticker.id}
                sticker={sticker}
                sort={sort}
                category={search.category}
              />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid size-14 place-items-center rounded-[18px] bg-[#f5f5f7] text-neutral-400">
              <MagnifyingGlass weight="bold" className="size-6" />
            </div>
            <p className="text-[15px] text-neutral-500">No stickers match.</p>
          </div>
        )}

        <Pagination
          page={data.page}
          pageCount={data.pageCount}
          total={data.total}
          onNavigate={scrollToList}
        />
      </section>
    </div>
  )
}

function ListRow({
  sticker,
  sort,
  category,
}: {
  sticker: StickerListItem
  sort: "top" | "newest"
  category: Category | undefined
}) {
  const position = category ? sticker.rank?.category : sticker.rank?.overall
  return (
    <StickerRow
      slug={sticker.slug}
      name={sticker.name}
      oneLiner={sticker.oneLiner}
      url={sticker.url}
      imageSrc={sticker.imageUrl}
      leading={
        sort === "top" ? (
          <RankBadge position={position} spent={sticker.totalSpent} />
        ) : null
      }
      meta={
        <>
          <CategoryTag category={sticker.category} />
          {sort === "newest" && sticker.totalSpent > 0 ? (
            <span className="shrink-0 text-neutral-500">
              · ${sticker.totalSpent.toLocaleString("en-US")}
            </span>
          ) : null}
        </>
      }
    />
  )
}

/** 1 … 4 5 6 … 12 */
function pageWindow(page: number, count: number): Array<number | "gap"> {
  const pages = new Set([1, count, page - 1, page, page + 1])
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= count)
    .sort((a, b) => a - b)
  const out: Array<number | "gap"> = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push("gap")
    out.push(p)
  })
  return out
}

function Pagination({
  page,
  pageCount,
  total,
  onNavigate,
}: {
  page: number
  pageCount: number
  total: number
  onNavigate: () => void
}) {
  if (pageCount <= 1) return null
  const from = (page - 1) * STICKERS_PAGE_SIZE + 1
  const to = Math.min(page * STICKERS_PAGE_SIZE, total)
  const step =
    "press inline-flex h-10 items-center gap-1 rounded-full px-4 text-[14px] font-semibold tracking-[-0.01em] transition-colors"

  function pageLink(
    target: number,
    children: React.ReactNode,
    className: string
  ) {
    return (
      <Link
        to="/stickers"
        search={(prev) => ({ ...prev, page: target > 1 ? target : undefined })}
        resetScroll={false}
        onClick={onNavigate}
        className={className}
      >
        {children}
      </Link>
    )
  }

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-between gap-3 border-t border-black/[0.06] pt-6"
    >
      {page > 1 ? (
        pageLink(
          page - 1,
          <>
            <CaretLeft weight="bold" className="size-3.5" />
            Previous
          </>,
          cn(step, "bg-black/[0.05] text-neutral-900 hover:bg-black/[0.09]")
        )
      ) : (
        <span className={cn(step, "text-neutral-300")} aria-hidden>
          <CaretLeft weight="bold" className="size-3.5" />
          Previous
        </span>
      )}

      <div className="hidden items-center gap-1 sm:flex">
        {pageWindow(page, pageCount).map((p, i) =>
          p === "gap" ? (
            <span key={`gap-${i}`} className="px-1 text-neutral-400">
              …
            </span>
          ) : p === page ? (
            <span
              key={p}
              aria-current="page"
              className="grid size-9 place-items-center rounded-full bg-neutral-900 text-[13px] font-semibold text-white tabular-nums"
            >
              {p}
            </span>
          ) : (
            <span key={p}>
              {pageLink(
                p,
                p,
                "press grid size-9 place-items-center rounded-full text-[13px] font-medium text-neutral-600 tabular-nums transition-colors hover:bg-black/[0.05] hover:text-neutral-900"
              )}
            </span>
          )
        )}
      </div>
      <p className="text-[13px] text-neutral-500 tabular-nums sm:hidden">
        {from}–{to} of {total}
      </p>

      {page < pageCount ? (
        pageLink(
          page + 1,
          <>
            Next
            <CaretRight weight="bold" className="size-3.5" />
          </>,
          cn(step, "bg-neutral-900 text-white hover:opacity-90")
        )
      ) : (
        <span className={cn(step, "text-neutral-300")} aria-hidden>
          Next
          <CaretRight weight="bold" className="size-3.5" />
        </span>
      )}
    </nav>
  )
}

const MEDALS = [
  "bg-gradient-to-b from-[#ffe08a] to-[#f0a000] text-[#5c3800]",
  "bg-gradient-to-b from-[#f2f4f7] to-[#b4bac3] text-[#3b4148]",
  "bg-gradient-to-b from-[#f6cfa8] to-[#c47a3e] text-[#4f280a]",
]

function RankBadge({
  position,
  spent,
}: {
  position: number | undefined
  spent: number
}) {
  const medal = position ? MEDALS[position - 1] : undefined
  return (
    <div className="flex w-11 flex-col items-center gap-1">
      <span
        className={cn(
          "grid size-8 place-items-center rounded-full text-[15px] font-semibold tracking-[-0.02em] tabular-nums",
          medal
            ? cn(
                medal,
                "shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_2px_6px_-2px_rgba(0,0,0,0.25)]"
              )
            : position
              ? "text-neutral-900"
              : "text-neutral-300"
        )}
      >
        {position ?? "–"}
      </span>
      {position ? (
        <span className="max-w-full truncate text-[11px] font-semibold tracking-[-0.01em] text-neutral-500 tabular-nums">
          ${spent.toLocaleString("en-US")}
        </span>
      ) : null}
    </div>
  )
}

const CLUSTER_SLOTS = [
  "left-0 top-3 -rotate-[10deg] group-hover:-translate-x-1.5 group-hover:-rotate-[16deg]",
  "right-0 top-0 rotate-[9deg] group-hover:translate-x-1.5 group-hover:rotate-[15deg]",
  "left-1/2 bottom-0 -translate-x-1/2 rotate-[2deg] group-hover:-translate-y-1 group-hover:-rotate-[2deg]",
]

/** Decorative stack of the current top stickers. */
function StickerCluster({ stickers }: { stickers: StickerDTO[] }) {
  if (!stickers.length) return null
  return (
    <div
      aria-hidden
      className="group relative h-24 w-28 shrink-0 sm:h-28 sm:w-36"
    >
      {stickers.map((s, i) => (
        <img
          key={s.id}
          src={s.imageUrl}
          alt=""
          className={cn(
            "absolute size-14 object-contain drop-shadow-[0_8px_14px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out sm:size-16",
            CLUSTER_SLOTS[i]
          )}
        />
      ))}
    </div>
  )
}
