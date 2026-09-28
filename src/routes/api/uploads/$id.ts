import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/lib/auth"
import { contentDisposition } from "@/lib/files"
import { prisma } from "@/lib/prisma"
import { getObject } from "@/lib/s3"

export const Route = createFileRoute("/api/uploads/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const upload = await prisma.upload.findFirst({
          where: { id: params.id, userId: session.user.id },
        })
        if (!upload) {
          return Response.json({ error: "File not found." }, { status: 404 })
        }

        const body = await getObject(upload.key)
        if (!body) {
          return Response.json(
            { error: "File is missing from storage." },
            { status: 404 }
          )
        }

        return new Response(body.transformToWebStream(), {
          headers: {
            "content-type": upload.contentType,
            "content-length": String(upload.sizeBytes),
            "content-disposition": contentDisposition(upload.fileName),
          },
        })
      },
    },
  },
})
