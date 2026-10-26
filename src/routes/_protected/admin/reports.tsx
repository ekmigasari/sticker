import { useCallback } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ReportList } from "@/components/admin/report-list"
import {
  AdminPager,
  EmptyRows,
  FilterChips,
  ResultCount,
  SearchField,
} from "@/components/admin/admin-ui"
import { listAdminReports, type AdminReportFilter } from "@/lib/admin"

type ReportsSearch = {
  q?: string
  filter?: Exclude<AdminReportFilter, "open">
  page?: number
}

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "upheld", label: "Taken down" },
  { id: "dismissed", label: "Dismissed" },
  { id: "all", label: "All" },
] as const

export const Route = createFileRoute("/_protected/admin/reports")({
  validateSearch: (search: Record<string, unknown>): ReportsSearch => {
    const page = Math.floor(Number(search.page))
    return {
      q: typeof search.q === "string" && search.q ? search.q : undefined,
      filter:
        search.filter === "upheld" ||
        search.filter === "dismissed" ||
        search.filter === "all"
          ? search.filter
          : undefined,
      page: page > 1 ? page : undefined,
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    listAdminReports({
      data: { ...deps, filter: deps.filter ?? "open" },
    }),
  component: AdminReportsPage,
})

function AdminReportsPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const update = useCallback(
    (next: Partial<ReportsSearch>) =>
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
          placeholder="Search sticker, reporter or details"
          onChange={onSearch}
        />
        <FilterChips
          options={FILTERS}
          value={search.filter ?? "open"}
          onChange={(filter) =>
            update({ filter: filter === "open" ? undefined : filter })
          }
        />
      </div>
      <ResultCount total={data.total} noun="report" />
      {data.items.length ? (
        <ReportList reports={data.items} />
      ) : (
        <EmptyRows>
          {search.q || search.filter
            ? "No reports match that."
            : "No open reports."}
        </EmptyRows>
      )}
      <AdminPager
        page={data.page}
        pageCount={data.pageCount}
        onPage={(page) =>
          void navigate({
            search: (prev) => ({ ...prev, page: page > 1 ? page : undefined }),
            resetScroll: false,
          })
        }
      />
    </section>
  )
}
