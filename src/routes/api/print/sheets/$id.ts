import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/lib/auth"
import { enforceRateLimit, RATE_RULES } from "@/lib/rate-limit"
import { parseSheetInput } from "@/lib/print-layout"
import {
  deletePrintSheet,
  getPrintSheet,
  updatePrintSheet,
} from "@/lib/print-sheets"

async function userId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers })
  return session?.user.id ?? null
}

export const Route = createFileRoute("/api/print/sheets/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const id = await userId(request)
        if (!id) {
          return Response.json(
            { error: "Sign in to open this sheet." },
            { status: 401 }
          )
        }
        const sheet = await getPrintSheet(id, params.id)
        if (!sheet) {
          return Response.json(
            { error: "That sheet isn't on this account." },
            { status: 404 }
          )
        }
        return Response.json({ sheet })
      },

      PATCH: async ({ request, params }) => {
        const id = await userId(request)
        if (!id) {
          return Response.json(
            { error: "Sign in to save this sheet." },
            { status: 401 }
          )
        }
        const limited = await enforceRateLimit(id, RATE_RULES.printSheet)
        if (limited) return limited

        const parsed = parseSheetInput(await request.json().catch(() => null))
        if ("error" in parsed) {
          return Response.json({ error: parsed.error }, { status: 400 })
        }
        const result = await updatePrintSheet(id, params.id, parsed)
        if ("error" in result) {
          return Response.json(
            { error: result.error },
            { status: result.status }
          )
        }
        return Response.json({ sheet: result.sheet })
      },

      DELETE: async ({ request, params }) => {
        const id = await userId(request)
        if (!id) {
          return Response.json(
            { error: "Sign in to delete this sheet." },
            { status: 401 }
          )
        }
        const limited = await enforceRateLimit(id, RATE_RULES.printSheet)
        if (limited) return limited
        const error = await deletePrintSheet(id, params.id)
        if (error) {
          return Response.json({ error: error.error }, { status: error.status })
        }
        return Response.json({ ok: true })
      },
    },
  },
})
