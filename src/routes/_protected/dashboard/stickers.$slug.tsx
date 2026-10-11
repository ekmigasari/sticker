import { createFileRoute, redirect } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerManage } from "@/components/dashboard/sticker-manage"
import { getMySticker, listPublicStickers } from "@/lib/stickers"

export const Route = createFileRoute("/_protected/dashboard/stickers/$slug")({
  loader: async ({ params }) => {
    const [sticker, all] = await Promise.all([
      getMySticker({ data: params.slug }),
      listPublicStickers(),
    ])
    // Older links carry the sticker id; settle them on the slug URL.
    if (sticker && sticker.slug !== params.slug) {
      throw redirect({
        to: "/dashboard/stickers/$slug",
        params: { slug: sticker.slug },
        replace: true,
      })
    }
    return { sticker, all }
  },
  component: DashboardStickerPage,
})

function DashboardStickerPage() {
  const { sticker, all } = Route.useLoaderData()
  return (
    <AppChrome>
      <StickerManage sticker={sticker} all={all} />
    </AppChrome>
  )
}
