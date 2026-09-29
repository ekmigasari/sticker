import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { DirectoryList } from "@/components/directory/directory-list"
import { listPublicStickers } from "@/lib/stickers"

export const Route = createFileRoute("/directory")({
  loader: () => listPublicStickers(),
  component: DirectoryPage,
})

function DirectoryPage() {
  const stickers = Route.useLoaderData()
  return (
    <AppChrome>
      <DirectoryList stickers={stickers} />
    </AppChrome>
  )
}
