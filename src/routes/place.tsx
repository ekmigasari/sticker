import { createFileRoute, redirect } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { PlaceFlow } from "@/components/place/place-flow"

export const Route = createFileRoute("/place")({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      throw redirect({
        to: "/sign-in",
        search: { next: "/place" },
      })
    }
  },
  component: PlacePage,
})

function PlacePage() {
  return (
    <AppChrome variant="bare">
      <PlaceFlow />
    </AppChrome>
  )
}
