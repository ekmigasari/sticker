import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/lib/auth"
import { enforceRateLimit, RATE_RULES } from "@/lib/rate-limit"
import { parseSheetInput } from "@/lib/print-layout"
import { createPrintSheet, listPrintSheets } from "@/lib/print-sheets"

async function userId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers })
  return session?.user.id ?? null
}

/** Sheets saved on the signed-in account. */
export const Route = createFileRoute("/api/print/sheets/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const id = await userId(request)
        if (!id) {
          return Response.json(
            { error: "Sign in to see saved sheets." },
            { status: 401 }
          )
        }
        return Response.json({ sheets: await listPrintSheets(id) })
      },

      POST: async ({ request }) => {
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
        const result = await createPrintSheet(id, parsed)
        if ("error" in result) {
          return Response.json(
            { error: result.error },
            { status: result.status }
          )
        }
        return Response.json({ sheet: result.sheet })
      },
    },
  },
})
