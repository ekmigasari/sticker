import type { DraftSticker } from "@/domain/types"
import type { ProductDTO, StickerDTO } from "@/lib/product-api"

export type PlaceProductInput = {
  name: string
  oneLiner: string
  url: string
  category: string
  offer?: string
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [header, data] = dataUrl.split(",")
  const mime = /data:(.*?);/.exec(header)?.[1] || "image/png"
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], fileName, { type: mime })
}

async function readError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string
  } | null
  return payload?.error ?? "Request failed."
}

/** Create directory Product + artwork Sticker from a Place draft. */
export async function publishPlaceListing(input: {
  product: PlaceProductInput
  sticker: DraftSticker
}): Promise<{ productId: string; stickerId: string }> {
  const productResponse = await fetch("/api/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input.product),
  })
  if (!productResponse.ok) {
    if (productResponse.status === 401) {
      throw new Error("Sign in to save your sticker to the directory.")
    }
    throw new Error(await readError(productResponse))
  }
  const productPayload = (await productResponse.json()) as {
    product: ProductDTO
  }
  const productId = productPayload.product.id

  const file = dataUrlToFile(
    input.sticker.imageDataUrl,
    `sticker-${input.sticker.style}.png`
  )
  const form = new FormData()
  form.set("file", file)
  form.set("style", input.sticker.style)
  form.set("filter", input.sticker.filter)
  form.set("outlineColor", input.sticker.outlineColor)
  form.set("outlineThickness", String(input.sticker.outlineThickness))

  const stickerResponse = await fetch(`/api/products/${productId}/stickers`, {
    method: "POST",
    body: form,
  })
  if (!stickerResponse.ok) {
    throw new Error(await readError(stickerResponse))
  }
  const stickerPayload = (await stickerResponse.json()) as {
    sticker: StickerDTO
  }

  return { productId, stickerId: stickerPayload.sticker.id }
}
