import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { StickerWall } from "@/components/wall/sticker-wall"

export const Route = createFileRoute("/")({ component: Home })

/** The landing page is the wall itself. */
function Home() {
  return (
    <AppChrome variant="wall">
      <StickerWall />
    </AppChrome>
  )
}
