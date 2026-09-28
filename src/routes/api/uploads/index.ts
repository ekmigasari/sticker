import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/lib/auth"
import { MAX_UPLOAD_BYTES, safeFileName } from "@/lib/files"
import { prisma } from "@/lib/prisma"
import { putObject } from "@/lib/s3"

export const Route = createFileRoute("/api/uploads/")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const form = await request.formData()
        const file = form.get("file")
        if (!(file instanceof File)) {
          return Response.json(
            { error: "Choose a file to upload." },
            { status: 400 }
          )
        }
        if (file.size === 0) {
          return Response.json(
            { error: "That file is empty." },
            { status: 400 }
          )
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          return Response.json(
            { error: "Files must be 10 MB or smaller." },
            { status: 400 }
          )
        }

        const id = crypto.randomUUID()
        const fileName = safeFileName(file.name)
        const key = `uploads/${session.user.id}/${id}-${fileName}`
        const bytes = new Uint8Array(await file.arrayBuffer())

        await putObject(key, bytes, file.type || "application/octet-stream")
        await prisma.upload.create({
          data: {
            id,
            userId: session.user.id,
            key,
            fileName,
            contentType: file.type || "application/octet-stream",
            sizeBytes: file.size,
          },
        })

        return Response.json({ id, fileName })
      },
    },
  },
})
