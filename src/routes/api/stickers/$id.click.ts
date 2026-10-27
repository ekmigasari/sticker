import { createFileRoute } from "@tanstack/react-router"
import { recordStickerClick } from "@/lib/visits"

/** Beacon when someone heads to the sticker's website. */
export const Route = createFileRoute("/api/stickers/$id/click")({
  server: {
    handlers: {
      POST: async ({ request, params }) =>
        (await recordStickerClick(request, params.id)) ??
        new Response(null, { status: 204 }),
    },
  },
})
