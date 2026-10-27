import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/lib/auth"
import { getOrderForBuyer } from "@/lib/payments"

/** The buyer polls this after checkout until the order settles. */
export const Route = createFileRoute("/api/orders/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }
        const paymentId = new URL(request.url).searchParams.get("payment_id")
        const order = await getOrderForBuyer(
          params.id,
          session.user.id,
          paymentId
        )
        if (!order) {
          return Response.json({ error: "Order not found." }, { status: 404 })
        }
        return Response.json(order, {
          headers: { "cache-control": "no-store" },
        })
      },
    },
  },
})
