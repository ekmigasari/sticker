import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerWall } from "@/components/wall/sticker-wall"
import { VisitorStats } from "@/components/wall/visitor-stats"
import { getSiteStats } from "@/lib/site-stats"

export const Route = createFileRoute("/")({
  loader: () => getSiteStats(),
  component: Home,
})

/** The landing page is the wall itself. */
function Home() {
  const stats = Route.useLoaderData()
  return (
    <AppChrome variant="wall">
      <StickerWall />
      {stats ? <VisitorStats stats={stats} /> : null}
    </AppChrome>
  )
}
