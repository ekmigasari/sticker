import { createFileRoute, redirect } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerDetail } from "@/components/stickers/sticker-detail"
import { getPublicSticker, listPublicStickers } from "@/lib/stickers"

export const Route = createFileRoute("/stickers/$slug")({
  loader: async ({ params }) => {
    const [sticker, all] = await Promise.all([
      getPublicSticker({ data: params.slug }),
      listPublicStickers(),
    ])
    if (sticker && sticker.slug !== params.slug) {
      throw redirect({
        to: "/stickers/$slug",
        params: { slug: sticker.slug },
      })
    }
    return { sticker, all }
  },
  component: StickerPage,
})

function StickerPage() {
  const { sticker, all } = Route.useLoaderData()
  return (
    <AppChrome>
      <StickerDetail
        sticker={sticker}
        all={all}
        back={{ to: "/stickers", label: "Stickers" }}
      />
    </AppChrome>
  )
}
