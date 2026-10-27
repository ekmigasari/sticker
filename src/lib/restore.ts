import type { Placement } from "@/domain/types"
import { readPurchase } from "@/lib/checkout-client"
import type { StickerRankPair } from "@/lib/ranks"
import type { StickerDTO } from "@/lib/sticker-api"

/** Leaderboard position before and after paying. */
export type RankChange = {
  before?: StickerRankPair
  after: StickerRankPair
}

/** The plots got covered more while checking out; re-confirm at `price`. */
export class PriceChangedError extends Error {
  constructor(readonly price: number) {
    super("The price changed while you were checking out.")
  }
}

export async function restoreSticker(input: {
  stickerId: string
  placementIds: string[]
  expectedPrice: number
}): Promise<{
  sticker: StickerDTO
  placements: Placement[]
  price: number
  rank: RankChange | null
}> {
  const response = await fetch(`/api/stickers/${input.stickerId}/restore`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      placementIds: input.placementIds,
      expectedPrice: input.expectedPrice,
    }),
  })
  if (response.status === 409) {
    const payload = (await response
      .clone()
      .json()
      .catch(() => null)) as { price?: number } | null
    if (typeof payload?.price === "number") {
      throw new PriceChangedError(payload.price)
    }
  }
  return readPurchase(response, "Sign in to restore it.")
}
