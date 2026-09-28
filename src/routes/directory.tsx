import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { DirectoryList } from "@/components/directory/directory-list"
import { listPublicProducts } from "@/lib/products"

export const Route = createFileRoute("/directory")({
  loader: () => listPublicProducts(),
  component: DirectoryPage,
})

function DirectoryPage() {
  const products = Route.useLoaderData()

  return (
    <AppChrome>
      <DirectoryList products={products} />
    </AppChrome>
  )
}
