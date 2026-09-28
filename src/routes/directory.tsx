import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { DirectoryList } from "@/components/directory/directory-list"

export const Route = createFileRoute("/directory")({
  component: DirectoryPage,
})

function DirectoryPage() {
  return (
    <AppChrome>
      <DirectoryList />
    </AppChrome>
  )
}
