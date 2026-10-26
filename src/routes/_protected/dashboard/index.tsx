import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import {
  DashboardHome,
  type BookView,
} from "@/components/dashboard/dashboard-home"
import { listMyPrintSheets } from "@/lib/print-sheet-list"
import { listMyStickers } from "@/lib/stickers"

export const Route = createFileRoute("/_protected/dashboard/")({
  validateSearch: (search: Record<string, unknown>): Partial<BookView> => {
    const page = Math.floor(Number(search.page))
    return {
      page: page > 1 ? page : undefined,
      tab:
        search.tab === "archived" ||
        search.tab === "wall" ||
        search.tab === "prints"
          ? search.tab
          : undefined,
    }
  },
  loader: async () => {
    const [stickers, sheets] = await Promise.all([
      listMyStickers(),
      listMyPrintSheets(),
    ])
    return { stickers, sheets }
  },
  component: DashboardPage,
})

function DashboardPage() {
  const { stickers, sheets } = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const { page = 1, tab = "book" } = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <AppChrome>
      <DashboardHome
        user={{ name: user.name, email: user.email, image: user.image }}
        stickers={stickers}
        sheets={sheets}
        view={{ page, tab }}
        onViewChange={(next) =>
          navigate({
            search: {
              page: next.page > 1 ? next.page : undefined,
              tab: next.tab === "book" ? undefined : next.tab,
            },
            replace: true,
            resetScroll: false,
          })
        }
      />
    </AppChrome>
  )
}
