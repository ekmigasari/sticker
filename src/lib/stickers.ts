import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { serializeSticker, type StickerDTO } from "@/lib/sticker-api"

async function requireUser() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session.user
}

export const listMyStickers = createServerFn({ method: "GET" }).handler(
  async (): Promise<StickerDTO[]> => {
    const user = await requireUser()
    const stickers = await prisma.sticker.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    })
    return stickers.map(serializeSticker)
  }
)

export const getMySticker = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<StickerDTO> => {
    const user = await requireUser()
    const sticker = await prisma.sticker.findFirst({
      where: { id, userId: user.id },
    })
    if (!sticker) {
      throw new Error("Sticker not found")
    }
    return serializeSticker(sticker)
  })

export const listPublicStickers = createServerFn({ method: "GET" }).handler(
  async (): Promise<StickerDTO[]> => {
    const stickers = await prisma.sticker.findMany({
      orderBy: { createdAt: "desc" },
    })
    return stickers.map(serializeSticker)
  }
)

export const getPublicSticker = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const sticker = await prisma.sticker.findUnique({ where: { id } })
    if (!sticker) return null
    return serializeSticker(sticker)
  })
