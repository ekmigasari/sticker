import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/lib/auth"
import {
  parseProductBody,
  serializeProduct,
  serializeSticker,
  withStickerCount,
} from "@/lib/product-api"
import { prisma } from "@/lib/prisma"

export const Route = createFileRoute("/api/products/")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const mine = url.searchParams.get("mine") === "1"
        const q = url.searchParams.get("q")?.trim().toLowerCase() ?? ""
        const category = url.searchParams.get("category")?.trim() ?? ""

        if (mine) {
          const session = await auth.api.getSession({
            headers: request.headers,
          })
          if (!session) {
            return Response.json({ error: "Unauthorized" }, { status: 401 })
          }
          const products = await prisma.product.findMany({
            where: { userId: session.user.id },
            include: { _count: { select: { stickers: true } } },
            orderBy: { createdAt: "desc" },
          })
          return Response.json({
            products: products.map((product) =>
              serializeProduct(withStickerCount(product))
            ),
          })
        }

        const products = await prisma.product.findMany({
          where: {
            AND: [
              category && category !== "All" ? { category } : {},
              q
                ? {
                    OR: [
                      { name: { contains: q, mode: "insensitive" } },
                      { oneLiner: { contains: q, mode: "insensitive" } },
                    ],
                  }
                : {},
            ],
          },
          include: {
            stickers: { orderBy: { createdAt: "desc" }, take: 1 },
            _count: { select: { stickers: true } },
          },
          orderBy: { createdAt: "desc" },
        })

        return Response.json({
          products: products.map((product) => ({
            ...serializeProduct(withStickerCount(product)),
            stickers: product.stickers.map(serializeSticker),
          })),
        })
      },

      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 })
        }

        const parsed = parseProductBody(body)
        if ("error" in parsed) {
          return Response.json({ error: parsed.error }, { status: 400 })
        }

        const product = await prisma.product.create({
          data: {
            id: crypto.randomUUID(),
            userId: session.user.id,
            ...parsed.data,
          },
        })

        return Response.json(
          { product: serializeProduct({ ...product, stickerCount: 0 }) },
          { status: 201 }
        )
      },
    },
  },
})
