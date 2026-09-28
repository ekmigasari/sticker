import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  serializeProduct,
  serializeSticker,
  withStickerCount,
  type ProductDTO,
  type StickerDTO,
} from "@/lib/product-api"

async function requireUser() {
  const request = getRequest()
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) {
    throw new Error("Unauthorized")
  }
  return session.user
}

export const listMyProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<ProductDTO[]> => {
    const user = await requireUser()
    const products = await prisma.product.findMany({
      where: { userId: user.id },
      include: { _count: { select: { stickers: true } } },
      orderBy: { createdAt: "desc" },
    })
    return products.map((product) => serializeProduct(withStickerCount(product)))
  }
)

export const getMyProduct = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<ProductDTO & { stickers: StickerDTO[] }> => {
    const user = await requireUser()
    const product = await prisma.product.findFirst({
      where: { id, userId: user.id },
      include: {
        stickers: { orderBy: { createdAt: "desc" } },
        _count: { select: { stickers: true } },
      },
    })
    if (!product) {
      throw new Error("Product not found")
    }
    return {
      ...serializeProduct(withStickerCount(product)),
      stickers: product.stickers.map(serializeSticker),
    }
  })

export const listPublicProducts = createServerFn({ method: "GET" }).handler(
  async (): Promise<Array<ProductDTO & { stickers: StickerDTO[] }>> => {
    const products = await prisma.product.findMany({
      include: {
        stickers: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: { select: { stickers: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    return products.map((product) => ({
      ...serializeProduct(withStickerCount(product)),
      stickers: product.stickers.map(serializeSticker),
    }))
  }
)

export const getPublicProduct = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        stickers: { orderBy: { createdAt: "desc" } },
        _count: { select: { stickers: true } },
      },
    })
    if (!product) return null
    return {
      ...serializeProduct(withStickerCount(product)),
      stickers: product.stickers.map(serializeSticker),
    }
  })
