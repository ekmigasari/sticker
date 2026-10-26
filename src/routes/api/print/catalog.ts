import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/lib/auth"
import { listOwnPrintStickers } from "@/lib/print-sheets"

/** Stickers the signed-in person can place on a paper. */
export const Route = createFileRoute("/api/print/catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json(
            { error: "Sign in to use your stickers." },
            { status: 401 }
          )
        }
        const q = new URL(request.url).searchParams.get("q") ?? ""
        const stickers = await listOwnPrintStickers(session.user.id, q)
        return Response.json({ stickers })
      },
    },
  },
})
