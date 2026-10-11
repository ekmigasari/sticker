import { useState } from "react"
import { MapPinPlus, MinusCircle } from "@phosphor-icons/react"
import { FormSheet } from "@/components/dashboard/form-sheet"
import { formatPlot, type MoveSpot } from "@/domain/types"

/** Confirms that buying a new spot takes the current one off the wall. */
export function NewSpotSheet({
  sticker,
  spot,
  pending,
  error,
  onOpenChange,
  onConfirm,
}: {
  sticker: { name: string; imageUrl: string }
  spot: MoveSpot | null
  pending: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: (spot: MoveSpot) => void
}) {
  // Keep the last spot while the sheet animates closed.
  const [shown, setShown] = useState(spot)
  if (spot && spot !== shown) setShown(spot)
  const view = spot ?? shown
  if (!view) return null
  const plot = formatPlot(view.unitsW, view.unitsH)

  return (
    <FormSheet
      open={spot != null}
      onOpenChange={(open) => {
        if (!pending) onOpenChange(open)
      }}
      title="New spot"
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-4">
          <img
            src={sticker.imageUrl}
            alt=""
            className="size-16 shrink-0 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.14)]"
          />
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold tracking-[-0.02em] text-neutral-900">
              Move {sticker.name}?
            </p>
            <p className="mt-0.5 text-[13px] text-neutral-500 tabular-nums">
              Current spot · {plot} plot
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-3 rounded-[20px] bg-[#f5f5f7] p-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[#ff3b30] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            <MinusCircle weight="bold" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-neutral-900">
              Your old spot will be removed
            </p>
            <p className="mt-0.5 text-[13px] leading-snug text-neutral-500">
              Once you pay for the new spot, the {plot} spot comes off the wall
              for good. What you paid for it stays in your total.
            </p>
          </div>
        </div>

        <p className="mt-3 text-[13px] leading-snug text-neutral-500">
          Next you pick a spot and size on the wall. It&apos;s paid as a new
          spot at $1 per unit, and nothing changes until you pay.
        </p>

        {error ? (
          <p
            role="alert"
            className="mt-3 text-[13px] font-medium text-[#ff3b30]"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex w-full flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={pending}
            onClick={() => onConfirm(view)}
            className="nk-btn flex-1"
          >
            <MapPinPlus weight="bold" className="size-4" />
            {pending ? "Loading…" : "Pick a new spot"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onOpenChange(false)}
            className="nk-btn-secondary flex-1"
          >
            Keep current spot
          </button>
        </div>
      </div>
    </FormSheet>
  )
}
