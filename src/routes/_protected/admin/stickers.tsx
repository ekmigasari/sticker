import { useCallback } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ModeratedStickerList } from "@/components/admin/admin-rows"
import {
  AdminPager,
  EmptyRows,
  FilterChips,
  ResultCount,
  SearchField,
} from "@/components/admin/admin-ui"
import { listAdminStickers, type AdminStickerFilter } from "@/lib/admin"

type StickersSearch = {
  q?: string
  filter?: Exclude<AdminStickerFilter, "all">
  page?: number
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "listed", label: "Listed" },
  { id: "hidden", label: "Taken down" },
  { id: "archived", label: "Archived" },
] as const

export const Route = createFileRoute("/_protected/admin/stickers")({
  validateSearch: (search: Record<string, unknown>): StickersSearch => {
    const page = Math.floor(Number(search.page))
    return {
      q: typeof search.q === "string" && search.q ? search.q : undefined,
      filter:
        search.filter === "listed" ||
        search.filter === "hidden" ||
        search.filter === "archived"
          ? search.filter
          : undefined,
      page: page > 1 ? page : undefined,
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listAdminStickers({ data: deps }),
  component: AdminStickersPage,
})

function AdminStickersPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const update = useCallback(
    (next: Partial<StickersSearch>) =>
      void navigate({
        search: (prev) => ({ ...prev, page: undefined, ...next }),
        replace: true,
        resetScroll: false,
      }),
    [navigate]
  )
  const onSearch = useCallback(
    (q: string | undefined) => update({ q }),
    [update]
  )

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <SearchField
          value={search.q}
          placeholder="Search name, link, owner email or id"
          onChange={onSearch}
        />
        <FilterChips
          options={FILTERS}
          value={search.filter ?? "all"}
          onChange={(filter) =>
            update({ filter: filter === "all" ? undefined : filter })
          }
        />
      </div>
      <ResultCount total={data.total} noun="sticker" />
      {data.items.length ? (
        <ModeratedStickerList stickers={data.items} />
      ) : (
        <EmptyRows>No stickers match.</EmptyRows>
      )}
      <AdminPager
        page={data.page}
        pageCount={data.pageCount}
        onPage={(page) => update({ page: page > 1 ? page : undefined })}
      />
    </section>
  )
}
