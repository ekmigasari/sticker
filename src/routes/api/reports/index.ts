import { createFileRoute } from "@tanstack/react-router"
import { Prisma } from "@/generated/prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { enforceRateLimit, RATE_RULES } from "@/lib/rate-limit"
import { parseReportInput } from "@/lib/report-reasons"
import { visibleStickerWhere } from "@/lib/sticker-api"

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
}

/** Signed-in users report a sticker. Admins read the queue at /admin/reports. */
export const Route = createFileRoute("/api/reports/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json(
            { error: "Sign in to report a sticker." },
            { status: 401 }
          )
        }
        const limited = await enforceRateLimit(
          session.user.id,
          RATE_RULES.report
        )
        if (limited) return limited

        const body = (await request.json().catch(() => null)) as {
          stickerId?: unknown
          reason?: unknown
          details?: unknown
        } | null
        const parsed = parseReportInput(body ?? {})
        if ("error" in parsed) {
          return Response.json({ error: parsed.error }, { status: 400 })
        }

        const sticker = await prisma.sticker.findFirst({
          where: { id: parsed.stickerId, ...visibleStickerWhere() },
          select: { id: true, userId: true },
        })
        if (!sticker) {
          return Response.json({ error: "Sticker not found." }, { status: 404 })
        }
        if (sticker.userId === session.user.id) {
          return Response.json(
            { error: "You can't report your own sticker." },
            { status: 400 }
          )
        }

        try {
          await prisma.report.create({
            data: {
              id: crypto.randomUUID(),
              stickerId: sticker.id,
              reporterId: session.user.id,
              reason: parsed.reason,
              details: parsed.details,
            },
          })
        } catch (error) {
          if (isUniqueViolation(error)) {
            return Response.json(
              { error: "You already reported this sticker. We'll review it." },
              { status: 409 }
            )
          }
          throw error
        }

        return Response.json({ ok: true })
      },
    },
  },
})
