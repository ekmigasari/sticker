import { createFileRoute } from "@tanstack/react-router"
import {
  STICKER_FILTERS,
  STICKER_STYLES,
  type StickerFilter,
  type StickerStyle,
} from "@/domain/types"
import { auth } from "@/lib/auth"
import { MAX_UPLOAD_BYTES, safeFileName } from "@/lib/files"
import { parseStickerDetails, serializeSticker } from "@/lib/sticker-api"
import { prisma } from "@/lib/prisma"
import { putObject } from "@/lib/s3"

function isStyle(value: string): value is StickerStyle {
  return (STICKER_STYLES as readonly string[]).includes(value)
}

function isFilter(value: string): value is StickerFilter {
  return (STICKER_FILTERS as readonly string[]).includes(value)
}

export const Route = createFileRoute("/api/stickers/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const sticker = await prisma.sticker.findUnique({
          where: { id: params.id },
        })
        if (!sticker) {
          return Response.json({ error: "Sticker not found." }, { status: 404 })
        }
        return Response.json({ sticker: serializeSticker(sticker) })
      },

      PATCH: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const existing = await prisma.sticker.findFirst({
          where: { id: params.id, userId: session.user.id },
        })
        if (!existing) {
          return Response.json({ error: "Sticker not found." }, { status: 404 })
        }

        const contentType = request.headers.get("content-type") ?? ""

        // Replace artwork via multipart
        if (contentType.includes("multipart/form-data")) {
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

          const styleRaw = String(form.get("style") ?? existing.style)
          const filterRaw = String(form.get("filter") ?? existing.filter)
          const outlineColor = String(
            form.get("outlineColor") ?? existing.outlineColor
          )
          const outlineThickness = Number(
            form.get("outlineThickness") ?? existing.outlineThickness
          )

          if (!isStyle(styleRaw) || !isFilter(filterRaw)) {
            return Response.json(
              { error: "Invalid sticker style or filter." },
              { status: 400 }
            )
          }

          const uploadId = crypto.randomUUID()
          const fileName = safeFileName(
            file.name || `sticker-${existing.id}.png`
          )
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
            return tx.sticker.update({
              where: { id: existing.id },
              data: {
                uploadId,
                style: styleRaw,
                filter: filterRaw,
                outlineColor: outlineColor.slice(0, 32),
                outlineThickness: Math.round(outlineThickness),
              },
            })
          })

          return Response.json({ sticker: serializeSticker(sticker) })
        }

        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: "Invalid JSON body." }, { status: 400 })
        }

        const parsed = parseStickerDetails(body)
        if ("error" in parsed) {
          return Response.json({ error: parsed.error }, { status: 400 })
        }

        const sticker = await prisma.sticker.update({
          where: { id: existing.id },
          data: parsed.data,
        })

        return Response.json({ sticker: serializeSticker(sticker) })
      },

      DELETE: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const sticker = await prisma.sticker.findFirst({
          where: { id: params.id, userId: session.user.id },
        })
        if (!sticker) {
          return Response.json({ error: "Sticker not found." }, { status: 404 })
        }

        await prisma.sticker.delete({ where: { id: sticker.id } })
        return Response.json({ ok: true })
      },
    },
  },
})
