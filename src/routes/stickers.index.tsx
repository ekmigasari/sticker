import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerList } from "@/components/stickers/sticker-list"
import { uncoveredPlacements } from "@/domain/types"
import { listStickerPage } from "@/lib/stickers"
import { WALL_FILTER, parseStickersSearch } from "@/lib/stickers-search"
import { useWallStore } from "@/store/wall-store"

/** Sticker ids with at least one placement still showing on this browser's wall. */
function stickerIdsOnWall(): string[] {
  useWallStore.getState().hydrate()
  return [
    ...new Set(
      uncoveredPlacements(useWallStore.getState().placements).map(
        (p) => p.stickerId
      )
    ),
  ]
}

export const Route = createFileRoute("/stickers/")({
  validateSearch: parseStickersSearch,
  // The wall is kept in localStorage, so the Wall filter can only load in the browser.
  ssr: ({ search }) =>
    !(search.status === "success" && search.value.category === WALL_FILTER),
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) =>
    listStickerPage({
      data: {
        ...(deps.category === WALL_FILTER
          ? { ids: stickerIdsOnWall() }
          : { category: deps.category }),
        sort: deps.sort ?? "top",
        q: deps.q,
        page: deps.page ?? 1,
      },
    }),
  head: () => ({ meta: [{ title: "Wall of Fame · Netkraft" }] }),
  pendingComponent: () => (
    <AppChrome>
      <div className="nk-page max-w-3xl" />
    </AppChrome>
  ),
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
