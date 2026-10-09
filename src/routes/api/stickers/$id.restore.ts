import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ranksFor } from "@/lib/ranks"
import { serializeSticker } from "@/lib/sticker-api"
import { restoreOnWall } from "@/lib/wall"

/** Put a sticker's covered plots back on top, paying for the covered units. */
export const Route = createFileRoute("/api/stickers/$id/restore")({
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
            { error: "Unarchive this sticker to restore it on the wall." },
            { status: 409 }
          )
        }

        const body = (await request.json().catch(() => null)) as {
          placementIds?: unknown
          expectedPrice?: unknown
        } | null
        const placementIds = Array.isArray(body?.placementIds)
          ? body.placementIds.filter(
              (id): id is string => typeof id === "string"
            )
          : []
        const expectedPrice = Number(body?.expectedPrice)
        if (!placementIds.length || !Number.isInteger(expectedPrice)) {
          return Response.json(
            { error: "Choose the spots to restore." },
            { status: 400 }
          )
        }

        const before = (await ranksFor([existing.id])).get(existing.id)
        const result = await prisma.$transaction(async (tx) => {
          const restored = await restoreOnWall(
            tx,
            existing.id,
            placementIds,
            expectedPrice
          )
          if (!restored.ok || !restored.price) return restored
          await tx.sticker.update({
            where: { id: existing.id },
            data: { totalSpent: { increment: restored.price } },
          })
          return restored
        })

        if (!result.ok) {
          return Response.json(
            {
              error: "The price changed while you were checking out.",
              price: result.price,
            },
            { status: 409 }
          )
        }
        if (!result.placements.length) {
          return Response.json(
            { error: "Those spots are already fully visible." },
            { status: 409 }
          )
        }

        const sticker = await prisma.sticker.findUniqueOrThrow({
          where: { id: existing.id },
        })
        const after = (await ranksFor([existing.id])).get(existing.id)
        return Response.json({
          sticker: serializeSticker(sticker),
          placements: result.placements,
          price: result.price,
          rank: after ? { before, after } : null,
        })
      },
    },
  },
})
