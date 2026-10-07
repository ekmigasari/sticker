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
import { WALL_FILTER, type StickersSearch } from "@/lib/stickers-search"
import type { StickerDTO } from "@/lib/sticker-api"
import { cn } from "@/lib/utils"

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
  const onWall = category === WALL_FILTER
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
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 sm:gap-x-10">
        <div className="min-w-0 self-end">
          <p className="mb-2 text-[13px] font-semibold tracking-[-0.01em] text-[#0071e3] tabular-nums">
            {data.stickerCount > 0
              ? `${data.stickerCount.toLocaleString("en-US")} cool ${data.stickerCount === 1 ? "thing" : "things"} and counting`
              : "Fresh off the wall"}
          </p>
          <h1 className="nk-title">Wall of Fame</h1>
        </div>
        <StickerCluster
          stickers={data.featured}
          className="sm:row-span-2 sm:self-center"
        />
        <p className="nk-subtitle col-span-2 text-pretty sm:col-span-1">
          Cool things made by people on the internet. Apps, tools, and side
          projects that earned a spot on the wall.
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
            {(["All", WALL_FILTER, ...CATEGORIES] as const).map((c) => {
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
          {onWall ? (
            <>
              {" "}
              <span className="text-[#0071e3]">showing on the wall</span>
            </>
          ) : search.category ? (
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
                category={
                  search.category === WALL_FILTER ? undefined : search.category
                }
              />
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid size-14 place-items-center rounded-[18px] bg-[#f5f5f7] text-neutral-400">
              <MagnifyingGlass weight="bold" className="size-6" />
            </div>
            <p className="text-[15px] text-neutral-500">
              {onWall && !search.q
                ? "Nothing showing on the wall yet."
                : "No stickers match."}
            </p>
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
  const spent =
    sticker.totalSpent > 0
      ? `$${sticker.totalSpent.toLocaleString("en-US")}`
      : null
  return (
    <StickerRow
      slug={sticker.slug}
      name={sticker.name}
      oneLiner={sticker.oneLiner}
      url={sticker.url}
      imageSrc={sticker.imageUrl}
      badge={
        sort === "top" && position ? <RankBadge position={position} /> : null
      }
      meta={
        <>
          <CategoryTag category={sticker.category} />
          {spent ? (
            <span className="shrink-0 font-semibold text-neutral-600 sm:hidden">
              · {spent}
            </span>
          ) : null}
        </>
      }
      trailing={
        spent ? (
          <p className="hidden text-[15px] font-semibold tracking-[-0.01em] text-neutral-900 tabular-nums sm:block">
            {spent}
          </p>
        ) : null
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

function RankBadge({ position }: { position: number }) {
  return (
    <span className="inline-flex h-[22px] shrink-0 items-center rounded-[7px] bg-[#0071e3]/10 px-1.5 text-[12px] font-semibold tracking-[-0.01em] text-[#0071e3] tabular-nums">
      #{position}
    </span>
  )
}

const CLUSTER_SLOTS = [
  "left-0 top-[18%] -rotate-[10deg] group-hover:-translate-x-1 group-hover:-rotate-[15deg]",
  "right-0 top-0 rotate-[9deg] group-hover:translate-x-1 group-hover:rotate-[14deg]",
  "left-1/2 bottom-0 z-10 -translate-x-1/2 rotate-[2deg] group-hover:-translate-y-1 group-hover:-rotate-[2deg]",
]

/** Stack of the current top stickers; each one links to its website. */
function StickerCluster({
  stickers,
  className,
}: {
  stickers: StickerDTO[]
  className?: string
}) {
  if (!stickers.length) return null
  return (
    <div
      className={cn(
        "group relative h-[84px] w-[104px] shrink-0 sm:h-32 sm:w-40",
        className
      )}
    >
      {stickers.map((s, i) => (
        <a
          key={s.id}
          href={s.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`Visit ${s.name} website`}
          title={s.name}
          className={cn(
            "absolute size-12 rounded-[12px] transition-[translate,rotate,scale] duration-300 ease-out hover:z-20 hover:scale-110 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:outline-none sm:size-[72px]",
            CLUSTER_SLOTS[i]
          )}
        >
          <img
            src={s.imageUrl}
            alt=""
            className="size-full object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.18)]"
          />
        </a>
      ))}
    </div>
  )
}
