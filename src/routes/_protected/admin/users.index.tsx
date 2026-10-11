import { useCallback } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { UserList } from "@/components/admin/admin-rows"
import {
  AdminPager,
  EmptyRows,
  FilterChips,
  ResultCount,
  SearchField,
} from "@/components/admin/admin-ui"
import { listAdminUsers, type AdminUserFilter } from "@/lib/admin"

type UsersSearch = {
  q?: string
  filter?: Exclude<AdminUserFilter, "all">
  page?: number
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "banned", label: "Banned" },
  { id: "admins", label: "Admins" },
] as const

export const Route = createFileRoute("/_protected/admin/users/")({
  validateSearch: (search: Record<string, unknown>): UsersSearch => {
    const page = Math.floor(Number(search.page))
    return {
      q: typeof search.q === "string" && search.q ? search.q : undefined,
      filter:
        search.filter === "banned" || search.filter === "admins"
          ? search.filter
          : undefined,
      page: page > 1 ? page : undefined,
    }
  },
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => listAdminUsers({ data: deps }),
  component: AdminUsersPage,
})

function AdminUsersPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  const update = useCallback(
    (next: Partial<UsersSearch>) =>
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
          placeholder="Search name, email or id"
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
      <ResultCount total={data.total} noun="user" />
      {data.items.length ? (
        <UserList users={data.items} />
      ) : (
        <EmptyRows>No users match.</EmptyRows>
      )}
      <AdminPager
        page={data.page}
        pageCount={data.pageCount}
        onPage={(page) => update({ page: page > 1 ? page : undefined })}
      />
    </section>
  )
}
