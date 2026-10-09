import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  isFilter,
  isFinish,
  type DraftSticker,
  type MoveSpot,
  type StickerStyle,
} from "@/domain/types"
import type { StickerDTO } from "@/lib/sticker-api"
import { probeImageSize } from "@/lib/sticker-process"
import { useWallStore } from "@/store/wall-store"

/**
 * Open the wall flow to pick a new spot and size for one of a sticker's
 * plots, or a first spot when `spot` is null.
 */
export function useMoveSpot() {
  const navigate = useNavigate()
  const setDraftSticker = useWallStore((s) => s.setDraftSticker)
  const setPlaceDraft = useWallStore((s) => s.setPlaceDraft)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function moveSpot(sticker: StickerDTO, spot: MoveSpot | null) {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      const { width, height } = await probeImageSize(sticker.imageUrl)
      const draft: DraftSticker = {
        imageDataUrl: sticker.imageUrl,
        style: sticker.style as StickerStyle,
        filter: isFilter(sticker.filter) ? sticker.filter : "original",
        finish: isFinish(sticker.finish) ? sticker.finish : "none",
        outlineColor: sticker.outlineColor,
        outlineThickness: sticker.outlineThickness,
        widthPx: width,
        heightPx: height,
        move: {
          stickerId: sticker.id,
          slug: sticker.slug,
          name: sticker.name,
          placementId: spot?.id,
          from: spot ? { unitsW: spot.unitsW, unitsH: spot.unitsH } : undefined,
          spent: sticker.totalSpent,
        },
      }
      setDraftSticker(draft)
      setPlaceDraft(
        spot
          ? {
              sticker: draft,
              unitsW: spot.unitsW,
              unitsH: spot.unitsH,
              stickerScale: spot.stickerScale ?? 1,
              rotation: spot.rotation ?? 0,
              stickerOffsetX: spot.stickerOffsetX ?? 0,
              stickerOffsetY: spot.stickerOffsetY ?? 0,
            }
          : null
      )
      await navigate({ to: "/place" })
    } catch {
      setError("Couldn't load the artwork. Try again.")
      setPending(false)
    }
  }

  return { moveSpot, pending, error }
}
