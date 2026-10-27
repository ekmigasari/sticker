import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/lib/auth"
import { purchase } from "@/lib/payments"
import { prisma } from "@/lib/prisma"
import { enforceRateLimit, RATE_RULES } from "@/lib/rate-limit"
import { currentRestorePrice } from "@/lib/wall"

/** Put a sticker's covered plots back on top, paying for the covered units. */
export const Route = createFileRoute("/api/stickers/$id/restore")({
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

        const price = await currentRestorePrice(
          prisma,
          existing.id,
          placementIds
        )
        if (!price) {
          return Response.json(
            { error: "Those spots are already fully visible." },
            { status: 409 }
          )
        }
        if (price !== expectedPrice) {
          return Response.json(
            { error: "The price changed while you were checking out.", price },
            { status: 409 }
          )
        }

        return purchase({
          user: session.user,
          amount: price,
          cancelPath: "/dashboard",
          intent: { kind: "restore", stickerId: existing.id, placementIds },
        })
      },
    },
  },
})
