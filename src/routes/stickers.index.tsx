import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerList } from "@/components/stickers/sticker-list"
import { categoryHead, seo } from "@/lib/seo"
import { listStickerPage } from "@/lib/stickers"
import { WALL_FILTER, parseStickersSearch } from "@/lib/stickers-search"

export const Route = createFileRoute("/stickers/")({
  validateSearch: parseStickersSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    listStickerPage({
      data: {
        ...(deps.category === WALL_FILTER
          ? { onWall: true }
          : { category: deps.category }),
        sort: deps.sort ?? "top",
        q: deps.q,
        page: deps.page ?? 1,
      },
    }),
  head: ({ loaderData, match }) => {
    const { category, q, page } = match.search
    if (loaderData && category && category !== WALL_FILTER && !q) {
      return categoryHead(category, loaderData.total, { canonical: !page })
    }
    return {
      meta: seo({
        title: "Wall of Fame",
        description:
          "Every cool thing that made the wall, in one list. Find your next favorite.",
      }),
    }
  },
  component: StickersPage,
})

function StickersPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()

  return (
    <AppChrome>
      <StickerList
        data={data}
        search={search}
        onSearchChange={(next) =>
          void navigate({
            search: (prev) => ({ ...prev, ...next, page: undefined }),
            replace: true,
            resetScroll: false,
          })
        }
      />
    </AppChrome>
  )
}
