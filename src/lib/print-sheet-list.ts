import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { auth } from "@/lib/auth"
import type { PrintSheetSummary } from "@/lib/print-layout"
import { listPrintSheets } from "@/lib/print-sheets"

/** Saved sheets for the signed-in sticker book. Client imports stay an RPC stub. */
export const listMyPrintSheets = createServerFn({ method: "GET" }).handler(
  async (): Promise<PrintSheetSummary[]> => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) throw new Error("Unauthorized")
    return listPrintSheets(session.user.id)
  }
)
