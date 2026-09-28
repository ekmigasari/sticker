import { createFileRoute } from "@tanstack/react-router"
import { StickerGenerator } from "@/components/make/sticker-generator"

type MakeSearch = {
  productId?: string
}

export const Route = createFileRoute("/make")({
  validateSearch: (search: Record<string, unknown>): MakeSearch => ({
    productId:
      typeof search.productId === "string" && search.productId.length > 0
        ? search.productId
        : undefined,
  }),
  component: MakePage,
})

function MakePage() {
  const { productId } = Route.useSearch()
  return <StickerGenerator productId={productId} />
}
