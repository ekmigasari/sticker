import { createFileRoute } from "@tanstack/react-router"
import { AppChrome } from "@/components/layout/app-chrome"
import { PlaceFlow } from "@/components/place/place-flow"

export const Route = createFileRoute("/place")({ component: PlacePage })

function PlacePage() {
  return (
    <AppChrome variant="bare">
      <PlaceFlow />
    </AppChrome>
  )
}
