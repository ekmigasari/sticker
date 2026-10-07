import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerManage } from "@/components/dashboard/sticker-manage"
import { getMySticker, listPublicStickers } from "@/lib/stickers"

export const Route = createFileRoute("/_protected/dashboard/stickers/$id")({
  loader: async ({ params }) => {
    const [sticker, all] = await Promise.all([
      getMySticker({ data: params.id }),
      listPublicStickers(),
    ])
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
