import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { DashboardHome } from "@/components/dashboard/dashboard-home"
import { listMyProducts } from "@/lib/products"

export const Route = createFileRoute("/_protected/dashboard/")({
  loader: () => listMyProducts(),
  component: DashboardPage,
})

function DashboardPage() {
  const products = Route.useLoaderData()
  const { user } = Route.useRouteContext()

  return (
    <AppChrome>
      <DashboardHome userEmail={user.email} products={products} />
    </AppChrome>
  )
}
