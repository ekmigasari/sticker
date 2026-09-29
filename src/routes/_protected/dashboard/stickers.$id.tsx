import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerManage } from "@/components/dashboard/sticker-manage"
import { getMySticker } from "@/lib/stickers"

export const Route = createFileRoute("/_protected/dashboard/stickers/$id")({
  loader: ({ params }) => getMySticker({ data: params.id }),
  component: DashboardStickerPage,
})

function DashboardStickerPage() {
  const sticker = Route.useLoaderData()
  return (
    <AppChrome>
      <StickerManage sticker={sticker} />
    </AppChrome>
  )
}
