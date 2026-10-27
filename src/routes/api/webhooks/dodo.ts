import { createFileRoute } from "@tanstack/react-router"
import { handleDodoWebhook } from "@/lib/payments"

export const Route = createFileRoute("/api/webhooks/dodo")({
  server: {
    handlers: {
      POST: ({ request }) => handleDodoWebhook(request),
    },
  },
})
