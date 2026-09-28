import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/lib/auth"
import {
  parseProductBody,
  serializeProduct,
  serializeSticker,
  withStickerCount,
} from "@/lib/product-api"
import { prisma } from "@/lib/prisma"

export const Route = createFileRoute("/api/products/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const product = await prisma.product.findUnique({
          where: { id: params.id },
          include: {
            stickers: { orderBy: { createdAt: "desc" } },
            _count: { select: { stickers: true } },
          },
        })
        if (!product) {
          return Response.json({ error: "Product not found." }, { status: 404 })
        }
        return Response.json({
          product: {
            ...serializeProduct(withStickerCount(product)),
            stickers: product.stickers.map(serializeSticker),
          },
        })
      },

      PATCH: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const existing = await prisma.product.findFirst({
          where: { id: params.id, userId: session.user.id },
        })
        if (!existing) {
          return Response.json({ error: "Product not found." }, { status: 404 })
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

        const product = await prisma.product.update({
          where: { id: existing.id },
          data: parsed.data,
          include: { _count: { select: { stickers: true } } },
        })

        return Response.json({
          product: serializeProduct(withStickerCount(product)),
        })
      },

      DELETE: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const existing = await prisma.product.findFirst({
          where: { id: params.id, userId: session.user.id },
          include: { stickers: true },
        })
        if (!existing) {
          return Response.json({ error: "Product not found." }, { status: 404 })
        }

        // Delete stickers first so upload FK restrict doesn't block product delete.
        // Uploads are left for the files page; sticker rows go away with product.
        await prisma.$transaction([
          prisma.sticker.deleteMany({ where: { productId: existing.id } }),
          prisma.product.delete({ where: { id: existing.id } }),
        ])

        return Response.json({ ok: true })
      },
    },
  },
})
