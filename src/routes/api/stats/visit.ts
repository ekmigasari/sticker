import { createFileRoute } from "@tanstack/react-router"
import { recordVisit } from "@/lib/visits"

/** Beacon from every full page load; counts each visitor once a day. */
export const Route = createFileRoute("/api/stats/visit")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        (await recordVisit(request)) ?? new Response(null, { status: 204 }),
    },
  },
})
