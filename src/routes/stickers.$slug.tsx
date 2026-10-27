import { createFileRoute, notFound, redirect } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerDetail } from "@/components/stickers/sticker-detail"
import { SITE_NAME, stickerHead } from "@/lib/seo"
import { getPublicSticker, listPublicStickers } from "@/lib/stickers"

export const Route = createFileRoute("/stickers/$slug")({
  loader: async ({ params }) => {
    const [sticker, all] = await Promise.all([
      getPublicSticker({ data: params.slug }),
      listPublicStickers(),
    ])
    if (!sticker) throw notFound()
    if (sticker.slug !== params.slug) {
      throw redirect({
        to: "/stickers/$slug",
        params: { slug: sticker.slug },
        statusCode: 301,
      })
    }
    return { sticker, all }
  },
  head: ({ loaderData }) =>
    loaderData
      ? stickerHead(loaderData.sticker)
      : {
          meta: [
            { title: `Sticker not found · ${SITE_NAME}` },
            { name: "robots", content: "noindex" },
          ],
        },
  component: StickerPage,
  notFoundComponent: () => (
    <AppChrome>
      <StickerDetail
        sticker={null}
        all={[]}
        back={{ to: "/stickers", label: "Stickers" }}
      />
    </AppChrome>
  ),
})

function StickerPage() {
  const { sticker, all } = Route.useLoaderData()
  const { session } = Route.useRouteContext()
  const signedIn = Boolean(session)
  const isOwner = session?.user.id === sticker.userId
  return (
    <AppChrome>
      <StickerDetail
        sticker={sticker}
        all={all}
        back={{ to: "/stickers", label: "Stickers" }}
        report={!isOwner ? { slug: sticker.slug, signedIn } : undefined}
      />
    </AppChrome>
  )
}
