import { createFileRoute } from "@tanstack/react-router"
import { plotPrice } from "@/domain/types"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ranksFor } from "@/lib/ranks"
import { serializeSticker } from "@/lib/sticker-api"
import { moveOnWall, parsePlacementInput } from "@/lib/wall"

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

        const existing = await prisma.sticker.findFirst({
          where: { id: params.id, userId: session.user.id },
          select: { id: true, archivedAt: true },
        })
        if (!existing) {
          return Response.json({ error: "Sticker not found." }, { status: 404 })
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
        const price = plotPrice(plot.unitsW, plot.unitsH)

        const before = (await ranksFor([existing.id])).get(existing.id)
        const placement = await prisma.$transaction(async (tx) => {
          const moved = await moveOnWall(tx, existing.id, placementId, plot)
          if (moved) {
            await tx.sticker.update({
              where: { id: existing.id },
              data: { totalSpent: { increment: price } },
            })
          }
          return moved
        })
        if (!placement) {
          return Response.json(
            {
              error: placementId
                ? "That spot is no longer on the wall."
                : "This sticker already has a spot. Move that one instead.",
            },
            { status: 409 }
          )
        }

        const sticker = await prisma.sticker.findUniqueOrThrow({
          where: { id: existing.id },
        })
        const after = (await ranksFor([existing.id])).get(existing.id)
        return Response.json({
          sticker: serializeSticker(sticker),
          placement,
          movedFrom: placementId,
          price,
          rank: after ? { before, after } : null,
        })
      },
    },
  },
})
