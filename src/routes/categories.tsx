import { createFileRoute, Link } from "@tanstack/react-router"
import { CaretLeft, CaretRight } from "@phosphor-icons/react"
import { CategoryIcon, categoryAccent } from "@/components/category-icon"
import { AppChrome } from "@/components/layout/app-chrome"
import { cn } from "@/lib/utils"
import { listCategorySummaries, type CategorySummary } from "@/lib/stickers"

export const Route = createFileRoute("/categories")({
  loader: () => listCategorySummaries(),
  head: () => ({ meta: [{ title: "Categories · Netkraft" }] }),
  component: CategoriesPage,
})

function CategoriesPage() {
  const summaries = Route.useLoaderData()
  const sorted = [...summaries].sort((a, b) => b.count - a.count)
  const used = sorted.filter((s) => s.count > 0).length

  return (
    <AppChrome>
      <div className="nk-page max-w-3xl">
        <header className="flex flex-col gap-3">
          <Link
            to="/stickers"
            className="press -ml-2 inline-flex h-9 w-fit items-center gap-0.5 rounded-full pr-3 pl-1.5 text-[16px] tracking-[-0.01em] text-[#0071e3] transition-colors hover:bg-[#0071e3]/[0.06]"
          >
            <CaretLeft weight="bold" className="size-[18px]" />
            Stickers
          </Link>
          <h1 className="nk-title">Categories</h1>
          <p className="nk-subtitle">
            {summaries.length} categories · {used} with stickers. Pick one to
            see its leaderboard.
          </p>
        </header>

        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          {sorted.map((summary) => (
            <CategoryCard key={summary.category} summary={summary} />
          ))}
        </ul>
      </div>
    </AppChrome>
  )
}

function CategoryCard({ summary }: { summary: CategorySummary }) {
  const accent = categoryAccent(summary.category)
  const empty = summary.count === 0
  return (
    <li>
      <Link
        to="/stickers"
        search={{ category: summary.category }}
        className={cn(
          "group relative flex h-full min-h-[148px] flex-col overflow-hidden rounded-[24px] bg-[#f5f5f7] p-4 transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_0_0_1px_rgba(0,0,0,0.06),0_14px_30px_-18px_rgba(0,0,0,0.3)] focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:outline-none",
          empty && "opacity-70 hover:opacity-100"
        )}
      >
        <span className="grid size-10 place-items-center rounded-[13px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_-6px_rgba(0,0,0,0.12)]">
          <CategoryIcon
            category={summary.category}
            color={accent}
            className="size-5"
          />
        </span>

        <div className="pointer-events-none absolute top-3 right-3 flex">
          {summary.previews.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              loading="lazy"
              className={cn(
                "size-11 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.18)] transition-transform duration-300 ease-out sm:size-12",
                i > 0 && "-ml-5",
                ["-rotate-6", "rotate-3", "rotate-12"][i],
                "group-hover:scale-105"
              )}
            />
          ))}
        </div>

        <div className="mt-auto pt-6">
          <p className="text-[15px] leading-tight font-semibold tracking-[-0.02em] break-words text-neutral-900">
            {summary.category}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-neutral-500 tabular-nums">
            {summary.count} {summary.count === 1 ? "sticker" : "stickers"}
            {summary.spent > 0
              ? ` · $${summary.spent.toLocaleString("en-US")}`
              : null}
            <CaretRight
              weight="bold"
              className="ml-auto size-3.5 text-neutral-400 transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </p>
        </div>
      </Link>
    </li>
  )
}
