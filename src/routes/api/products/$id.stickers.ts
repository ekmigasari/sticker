import { createFileRoute } from "@tanstack/react-router"
import {
  STICKER_FILTERS,
  STICKER_STYLES,
  type StickerFilter,
  type StickerStyle,
} from "@/domain/types"
import { auth } from "@/lib/auth"
import { MAX_UPLOAD_BYTES, safeFileName } from "@/lib/files"
import { getOwnedProduct, serializeSticker } from "@/lib/product-api"
import { prisma } from "@/lib/prisma"
import { putObject } from "@/lib/s3"

function isStyle(value: string): value is StickerStyle {
  return (STICKER_STYLES as readonly string[]).includes(value)
}

function isFilter(value: string): value is StickerFilter {
  return (STICKER_FILTERS as readonly string[]).includes(value)
}

export const Route = createFileRoute("/api/products/$id/stickers")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const product = await getOwnedProduct(params.id, session.user.id)
        if (!product) {
          return Response.json({ error: "Product not found." }, { status: 404 })
        }

        const form = await request.formData()
        const file = form.get("file")
        if (!(file instanceof File)) {
          return Response.json(
            { error: "Choose a sticker image to upload." },
            { status: 400 }
          )
        }
        if (!file.type.startsWith("image/")) {
          return Response.json(
            { error: "Stickers must be an image file." },
            { status: 400 }
          )
        }
        if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
          return Response.json(
            { error: "Images must be between 1 byte and 10 MB." },
            { status: 400 }
          )
        }

        const styleRaw = String(form.get("style") ?? "classic")
        const filterRaw = String(form.get("filter") ?? "original")
        const outlineColor = String(form.get("outlineColor") ?? "#FFFFFF")
        const outlineThickness = Number(form.get("outlineThickness") ?? 16)

        if (!isStyle(styleRaw)) {
          return Response.json({ error: "Invalid sticker style." }, { status: 400 })
        }
        if (!isFilter(filterRaw)) {
          return Response.json(
            { error: "Invalid sticker filter." },
            { status: 400 }
          )
        }
        if (
          !Number.isFinite(outlineThickness) ||
          outlineThickness < 0 ||
          outlineThickness > 64
        ) {
          return Response.json(
            { error: "Outline thickness is out of range." },
            { status: 400 }
          )
        }

        const uploadId = crypto.randomUUID()
        const stickerId = crypto.randomUUID()
        const fileName = safeFileName(file.name || `sticker-${stickerId}.png`)
        const key = `stickers/${session.user.id}/${uploadId}-${fileName}`
        const bytes = new Uint8Array(await file.arrayBuffer())

        await putObject(key, bytes, file.type || "image/png")

        const sticker = await prisma.$transaction(async (tx) => {
          await tx.upload.create({
            data: {
              id: uploadId,
              userId: session.user.id,
              key,
              fileName,
              contentType: file.type || "image/png",
              sizeBytes: file.size,
            },
          })
          return tx.sticker.create({
            data: {
              id: stickerId,
              userId: session.user.id,
              productId: product.id,
              uploadId,
              style: styleRaw,
              filter: filterRaw,
              outlineColor: outlineColor.slice(0, 32),
              outlineThickness: Math.round(outlineThickness),
            },
          })
        })

        return Response.json(
          { sticker: serializeSticker(sticker) },
          { status: 201 }
        )
      },
    },
  },
})
