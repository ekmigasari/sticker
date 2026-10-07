import type { DraftSticker, Placement } from "@/domain/types"
import type { StickerDTO } from "@/lib/sticker-api"

export type PlaceStickerInput = {
  name: string
  oneLiner: string
  url: string
  category: string
  description?: string
  offer?: string
  offerCode?: string
  offerExpiresOn?: string
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

/** Create a listed sticker (details + artwork) and stick its plot on the wall. */
export async function publishPlaceListing(input: {
  details: PlaceStickerInput
  sticker: DraftSticker
  plot: {
    x: number
    y: number
    unitsW: number
    unitsH: number
    stickerScale: number
    rotation: number
    offsetX: number
    offsetY: number
  }
}): Promise<{ sticker: StickerDTO; placement: Placement }> {
  const file = dataUrlToFile(
    input.sticker.imageDataUrl,
    `sticker-${input.sticker.style}.png`
  )
  const form = new FormData()
  form.set("file", file)
  form.set("name", input.details.name)
  form.set("oneLiner", input.details.oneLiner)
  form.set("url", input.details.url)
  form.set("category", input.details.category)
  if (input.details.description) {
    form.set("description", input.details.description)
  }
  if (input.details.offer) form.set("offer", input.details.offer)
  if (input.details.offerCode) form.set("offerCode", input.details.offerCode)
  if (input.details.offerExpiresOn) {
    form.set("offerExpiresOn", input.details.offerExpiresOn)
  }
  form.set("style", input.sticker.style)
  form.set("filter", input.sticker.filter)
  form.set("outlineColor", input.sticker.outlineColor)
  form.set("outlineThickness", String(input.sticker.outlineThickness))
  for (const [key, value] of Object.entries(input.plot)) {
    form.set(key, String(value))
  }

  const response = await fetch("/api/stickers", {
    method: "POST",
    body: form,
  })
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Sign in to list your sticker.")
    }
    throw new Error(await readError(response))
  }
  const payload = (await response.json()) as {
    sticker: StickerDTO
    placement: Placement | null
  }
  if (!payload.placement)
    throw new Error("Could not place sticker on the wall.")
  return { sticker: payload.sticker, placement: payload.placement }
}
