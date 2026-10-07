import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { auth } from "./auth"
import { prisma } from "./prisma"

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    try {
      const request = getRequest()
      const session = await auth.api.getSession({ headers: request.headers })
      if (!session) return null
      return {
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image ?? null,
        },
      }
    } catch {
      // Auth/DB may be unavailable in local prototype preview.
      return null
    }
  }
)

export const listUploads = createServerFn({ method: "GET" }).handler(
  async () => {
    const request = getRequest()
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      throw new Error("Unauthorized")
    }

    const uploads = await prisma.upload.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    })

    return uploads.map((upload) => ({
      id: upload.id,
      fileName: upload.fileName,
      contentType: upload.contentType,
      sizeBytes: upload.sizeBytes,
      createdAt: upload.createdAt.toISOString(),
    }))
  }
)
