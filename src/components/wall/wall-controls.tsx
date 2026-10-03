import { Link } from "@tanstack/react-router"
import { Compass, CornersOut, Minus, Plus } from "@phosphor-icons/react"
import { glassCapsule } from "@/components/layout/site-nav"
import { UNIT_SCALE } from "@/domain/types"
import { cn } from "@/lib/utils"
import { useWallStore } from "@/store/wall-store"
import {
  ZOOM_MAX,
  cancelCameraAnimation,
  exploreRandom,
  fitWall,
  minZoom,
  zoomBy,
} from "./camera"

const glass = glassCapsule

/**
 * Vertical zoom stack. Sits on the right edge, vertically centred, so it never
 * collides with the top nav or a bottom bar, and stays in thumb reach.
 * Shared by the browse wall and the place flow.
 */
export function ZoomControls({ className }: { className?: string }) {
  const zoom = useWallStore((s) => s.camera.zoom)
  const atMin = zoom <= minZoom() + 1e-3
  const atMax = zoom >= ZOOM_MAX - 1e-3
  const btn =
    "press grid size-11 place-items-center text-neutral-700 transition-colors hover:bg-black/[0.04] disabled:opacity-30 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-400"

  return (
    <div
      data-ui-chrome
      role="group"
      aria-label="Zoom"
      className={cn(
        "pointer-events-auto absolute top-1/2 right-3 z-20 flex -translate-y-1/2 flex-col overflow-hidden rounded-full sm:right-4",
        glass,
        className
      )}
    >
      <button
        type="button"
        className={btn}
        aria-label="Zoom in"
        disabled={atMax}
        onClick={() => {
          cancelCameraAnimation()
          zoomBy(1.4)
        }}
      >
        <Plus weight="bold" className="size-4" />
      </button>
      <button
        type="button"
        className={cn(btn, "border-y border-black/[0.06]")}
        aria-label="Zoom out"
        disabled={atMin}
        onClick={() => {
          cancelCameraAnimation()
          zoomBy(1 / 1.4)
        }}
      >
        <Minus weight="bold" className="size-4" />
      </button>
      <button
        type="button"
        className={btn}
        aria-label="Fit wall to screen"
        onClick={fitWall}
      >
        <CornersOut weight="bold" className="size-4" />
      </button>
    </div>
  )
}

const SCALE_MAX_PX = 96
const SCALE_STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000]

/** Google Maps–style scale bar: a round number of wall units at the current zoom. */
export function ZoomScale({ className }: { className?: string }) {
  const zoom = useWallStore((s) => s.camera.zoom)
  const pxPerUnit = zoom * UNIT_SCALE
  const units =
    [...SCALE_STEPS].reverse().find((u) => u * pxPerUnit <= SCALE_MAX_PX) ??
    SCALE_STEPS[0]
  const width = Math.round(units * pxPerUnit)

  return (
    <div
      data-ui-chrome
      aria-label={`Scale: ${units} units`}
      className={cn(
        "pointer-events-none absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-20 flex flex-col items-end gap-0.5 font-ui sm:right-4",
        className
      )}
    >
      <span className="rounded-sm bg-white/80 px-1 text-[11px] font-medium text-neutral-700 tabular-nums backdrop-blur-sm">
        {units} u
      </span>
      <div
        aria-hidden
        className="h-1.5 border-x-2 border-b-2 border-neutral-700 bg-white/50 transition-[width] duration-150 ease-out"
        style={{ width }}
      />
    </div>
  )
}

/** Landing wall: zoom + scale, plus a bottom bar to explore or start making. */
export function WallControls() {
  const selected = useWallStore((s) => s.selectedPlacementId != null)

  return (
    <>
      <ZoomControls />
      <ZoomScale className="bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] sm:bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]" />
      {selected ? null : (
        <div
          data-ui-chrome
          className="pointer-events-none absolute right-3 bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-3 z-20 flex justify-center font-ui sm:bottom-[calc(env(safe-area-inset-bottom)+1.5rem)]"
        >
          <div
            className={cn(
              "pointer-events-auto flex items-center gap-1 rounded-full p-1.5",
              glassCapsule
            )}
          >
            <button
              type="button"
              onClick={() => {
                cancelCameraAnimation()
                exploreRandom()
              }}
              className="press inline-flex h-11 items-center gap-2 rounded-full px-5 text-[15px] font-semibold tracking-[-0.01em] text-neutral-900 transition-colors hover:bg-black/[0.05]"
            >
              <Compass weight="bold" className="size-[18px]" />
              Explore
            </button>
            <Link
              to="/make"
              className="press inline-flex h-11 items-center gap-2 rounded-full bg-neutral-900 px-5 text-[15px] font-semibold tracking-[-0.01em] text-white shadow-[0_6px_20px_-8px_rgba(0,0,0,0.5)] transition-opacity hover:opacity-90"
            >
              <Plus weight="bold" className="size-4" />
              Create sticker
            </Link>
          </div>
        </div>
      )}
    </>
  )
}
