import { useEffect, useMemo, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { WALL_SIZE } from "@/domain/types"
import { useWallStore } from "@/store/wall-store"
import { ProductSheet } from "./product-sheet"
import { WallControls } from "./wall-controls"

type Props = {
  placeMode?: boolean
  ghostSize?: number
  onPlace?: (x: number, y: number) => void
}

export function StickerWall({ placeMode, ghostSize = 50, onPlace }: Props) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const dragging = useRef(false)
  const last = useRef({ x: 0, y: 0 })
  const moved = useRef(false)
  const [grabbing, setGrabbing] = useState(false)

  const hydrate = useWallStore((s) => s.hydrate)
  const hydrated = useWallStore((s) => s.hydrated)
  const camera = useWallStore(useShallow((s) => s.camera))
  const setCamera = useWallStore((s) => s.setCamera)
  const rawPlacements = useWallStore((s) => s.placements)
  const selectedPlacementId = useWallStore((s) => s.selectedPlacementId)
  const placements = useMemo(
    () => [...rawPlacements].sort((a, b) => a.zIndex - b.zIndex),
    [rawPlacements]
  )
  const selectPlacement = useWallStore((s) => s.selectPlacement)
  const getProduct = useWallStore((s) => s.getProduct)
  const getSticker = useWallStore((s) => s.getSticker)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const cam = useWallStore.getState().camera
      const rect = el.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const factor = e.deltaY > 0 ? 0.9 : 1.1
      const nextZoom = Math.min(6, Math.max(0.55, cam.zoom * factor))

      const worldX = cam.x + (mx - rect.width / 2) / cam.zoom
      const worldY = cam.y + (my - rect.height / 2) / cam.zoom
      const newX = worldX - (mx - rect.width / 2) / nextZoom
      const newY = worldY - (my - rect.height / 2) / nextZoom
      useWallStore.getState().setCamera({
        zoom: nextZoom,
        x: Math.min(WALL_SIZE, Math.max(0, newX)),
        y: Math.min(WALL_SIZE, Math.max(0, newY)),
      })
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [])

  const selected = placements.find((p) => p.id === selectedPlacementId)
  const selectedProduct = selected ? getProduct(selected.productId) : undefined
  const selectedSticker = selected ? getSticker(selected.stickerId) : undefined

  return (
    <div className="relative h-[min(100dvh,100svh)] w-full overflow-hidden bg-cork">
      <div
        ref={viewportRef}
        className="absolute inset-0 touch-none select-none"
        style={{
          cursor: placeMode ? "crosshair" : grabbing ? "grabbing" : "grab",
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return
          dragging.current = true
          setGrabbing(true)
          moved.current = false
          last.current = { x: e.clientX, y: e.clientY }
          ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return
          const dx = e.clientX - last.current.x
          const dy = e.clientY - last.current.y
          if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true
          last.current = { x: e.clientX, y: e.clientY }
          if (placeMode) return
          const cam = useWallStore.getState().camera
          setCamera({
            x: Math.min(WALL_SIZE, Math.max(0, cam.x - dx / cam.zoom)),
            y: Math.min(WALL_SIZE, Math.max(0, cam.y - dy / cam.zoom)),
          })
        }}
        onPointerUp={(e) => {
          const el = viewportRef.current
          dragging.current = false
          setGrabbing(false)
          if (!el) return
          const cam = useWallStore.getState().camera

          if (placeMode && onPlace && !moved.current) {
            const rect = el.getBoundingClientRect()
            const mx = e.clientX - rect.left
            const my = e.clientY - rect.top
            const worldX = cam.x + (mx - rect.width / 2) / cam.zoom
            const worldY = cam.y + (my - rect.height / 2) / cam.zoom
            onPlace(worldX - ghostSize / 2, worldY - ghostSize / 2)
            return
          }

          if (!moved.current && !placeMode) {
            const target = e.target as HTMLElement
            if (target.dataset.placementId) {
              selectPlacement(target.dataset.placementId)
            } else if (!target.closest("[data-ui-chrome]")) {
              selectPlacement(null)
            }
          }
        }}
      >
        <div
          className="absolute top-1/2 left-1/2 origin-center will-change-transform"
          style={{
            width: WALL_SIZE,
            height: WALL_SIZE,
            transform: `translate(-50%, -50%) translate(${(WALL_SIZE / 2 - camera.x) * camera.zoom}px, ${(WALL_SIZE / 2 - camera.y) * camera.zoom}px) scale(${camera.zoom})`,
          }}
        >
          <div className="wall-board absolute inset-0 overflow-hidden rounded-sm shadow-2xl">
            <div className="wall-grid pointer-events-none absolute inset-0 opacity-40" />
            <div className="pointer-events-none absolute top-1/2 left-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-ink/20" />

            {hydrated
              ? placements.map((p) => {
                  const sticker = getSticker(p.stickerId)
                  if (!sticker) return null
                  const active = p.id === selectedPlacementId
                  return (
                    <button
                      key={p.id}
                      type="button"
                      data-placement-id={p.id}
                      className="absolute overflow-visible bg-transparent p-0 transition-transform hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      style={{
                        left: p.x,
                        top: p.y,
                        width: p.width,
                        height: p.height,
                        zIndex: p.zIndex,
                        transform: active ? "scale(1.04)" : undefined,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!placeMode) selectPlacement(p.id)
                      }}
                      aria-label={getProduct(p.productId)?.name ?? "Sticker"}
                    >
                      <img
                        src={sticker.imageDataUrl}
                        alt=""
                        draggable={false}
                        className="pointer-events-none size-full object-contain drop-shadow-md"
                        data-placement-id={p.id}
                      />
                    </button>
                  )
                })
              : null}

            {placeMode ? (
              <div
                className="pointer-events-none absolute inset-0 border-2 border-dashed border-ink/30"
                aria-hidden
              />
            ) : null}
          </div>
        </div>
      </div>

      <div data-ui-chrome className="contents">
        {!placeMode ? <WallControls /> : null}
        {!placeMode && selected && selectedProduct && selectedSticker ? (
          <ProductSheet
            product={selectedProduct}
            sticker={selectedSticker}
            placement={selected}
            onClose={() => selectPlacement(null)}
          />
        ) : null}
      </div>
    </div>
  )
}
