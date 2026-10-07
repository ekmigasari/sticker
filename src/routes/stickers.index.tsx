import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerList } from "@/components/stickers/sticker-list"
import { listStickerPage } from "@/lib/stickers"
import { parseStickersSearch } from "@/lib/stickers-search"

export const Route = createFileRoute("/stickers/")({
  validateSearch: parseStickersSearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    listStickerPage({
      data: {
        category: deps.category,
        sort: deps.sort ?? "top",
        q: deps.q,
        page: deps.page ?? 1,
      },
    }),
  head: () => ({ meta: [{ title: "Stickers · Netkraft" }] }),
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
