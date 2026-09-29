import { createFileRoute } from "@tanstack/react-router"
import { StickerGenerator } from "@/components/make/sticker-generator"

type MakeSearch = {
  stickerId?: string
  /** @deprecated use stickerId */
  productId?: string
}

export const Route = createFileRoute("/make")({
  validateSearch: (search: Record<string, unknown>): MakeSearch => {
    const stickerId =
      typeof search.stickerId === "string" && search.stickerId.length > 0
        ? search.stickerId
        : typeof search.productId === "string" && search.productId.length > 0
          ? search.productId
          : undefined
    return { stickerId }
  },
  component: MakePage,
})

function MakePage() {
  const { stickerId } = Route.useSearch()
  return <StickerGenerator stickerId={stickerId} />
}
