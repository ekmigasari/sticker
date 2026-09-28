import { createFileRoute, Link } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { ProductManage } from "@/components/dashboard/product-manage"
import { buttonVariants } from "@/components/ui/button"
import { getMyProduct } from "@/lib/products"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_protected/dashboard/products/$id")({
  loader: async ({ params }) => {
    try {
      return await getMyProduct({ data: params.id })
    } catch {
      return null
    }
  },
  component: DashboardProductPage,
})

function DashboardProductPage() {
  const product = Route.useLoaderData()

  if (!product) {
    return (
      <AppChrome>
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="font-heading text-3xl font-extrabold">
            Product not found
          </h1>
          <Link
            to="/dashboard"
            className={cn(buttonVariants(), "mt-4 inline-flex rounded-2xl")}
          >
            Back to dashboard
          </Link>
        </div>
      </AppChrome>
    )
  }

  const { stickers, ...productFields } = product

  return (
    <AppChrome>
      <ProductManage product={productFields} stickers={stickers} />
    </AppChrome>
  )
}
