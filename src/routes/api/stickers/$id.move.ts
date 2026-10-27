import { createFileRoute } from "@tanstack/react-router"
import { plotPrice } from "@/domain/types"
import { auth } from "@/lib/auth"
import { purchase } from "@/lib/payments"
import { prisma } from "@/lib/prisma"
import { enforceRateLimit, RATE_RULES } from "@/lib/rate-limit"
import { parsePlacementInput } from "@/lib/wall"

/**
 * Move one of a sticker's plots to a new spot and size, or give a sticker
 * with no plot its first one. The new plot is bought at full price; the old
 * one frees up.
 */
export const Route = createFileRoute("/api/stickers/$id/move")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }
        const limited = await enforceRateLimit(
          session.user.id,
          RATE_RULES.stickerWrite
        )
        if (limited) return limited

        const existing = await prisma.sticker.findFirst({
          where: { id: params.id, userId: session.user.id },
          select: { id: true, archivedAt: true, hiddenAt: true },
        })
        if (!existing) {
          return Response.json({ error: "Sticker not found." }, { status: 404 })
        }
        if (existing.hiddenAt) {
          return Response.json(
            { error: "This sticker was taken down by a moderator." },
            { status: 403 }
          )
        }
        if (existing.archivedAt) {
          return Response.json(
            { error: "Unarchive this sticker to move it on the wall." },
            { status: 409 }
          )
        }

        const form = await request.formData()
        const rawId = form.get("placementId")
        const placementId = typeof rawId === "string" && rawId ? rawId : null
        const plot = parsePlacementInput(form)
        if (!plot) {
          return Response.json({ error: "Invalid wall plot." }, { status: 400 })
        }

        return purchase({
          user: session.user,
          amount: plotPrice(plot.unitsW, plot.unitsH),
          cancelPath: "/place",
          intent: { kind: "move", stickerId: existing.id, placementId, plot },
        })
      },
    },
  },
})
