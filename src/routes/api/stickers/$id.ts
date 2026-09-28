import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const Route = createFileRoute("/api/stickers/$id")({
  server: {
    handlers: {
      DELETE: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const sticker = await prisma.sticker.findFirst({
          where: { id: params.id, userId: session.user.id },
        })
        if (!sticker) {
          return Response.json({ error: "Sticker not found." }, { status: 404 })
        }

        await prisma.sticker.delete({ where: { id: sticker.id } })
        return Response.json({ ok: true })
      },
    },
  },
})
