import { createFileRoute, redirect } from "@tanstack/react-router"
import { getPublicSticker } from "@/lib/stickers"

/** Legacy product URL → sticker page (slug when known). */
export const Route = createFileRoute("/product/$id")({
  beforeLoad: async ({ params }) => {
    const sticker = await getPublicSticker({ data: params.id })
    throw redirect({
      to: "/stickers/$slug",
      params: { slug: sticker?.slug ?? params.id },
    })
  },
})
