import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { DashboardHome } from "@/components/dashboard/dashboard-home"
import { listMyStickers } from "@/lib/stickers"

export const Route = createFileRoute("/_protected/dashboard/")({
  loader: () => listMyStickers(),
  component: DashboardPage,
})

function DashboardPage() {
  const stickers = Route.useLoaderData()
  const { user } = Route.useRouteContext()

  return (
    <AppChrome>
      <DashboardHome userEmail={user.email} stickers={stickers} />
    </AppChrome>
  )
}
