import { createFileRoute } from "@tanstack/react-router"
import { prisma } from "@/lib/prisma"
import { getObjectStream } from "@/lib/s3"

export const Route = createFileRoute("/api/stickers/$id/image")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const sticker = await prisma.sticker.findUnique({
          where: { id: params.id },
          include: { upload: true },
        })
        if (!sticker) {
          return Response.json({ error: "Sticker not found." }, { status: 404 })
        }

        let stream: ReadableStream
        try {
          stream = await getObjectStream(sticker.upload.key)
        } catch {
          return Response.json(
            { error: "Sticker image is missing from storage." },
            { status: 404 }
          )
        }

        return new Response(stream, {
          headers: {
            "content-type": sticker.upload.contentType,
            "content-length": String(sticker.upload.sizeBytes),
            "cache-control": "public, max-age=86400",
          },
        })
      },
    },
  },
})
