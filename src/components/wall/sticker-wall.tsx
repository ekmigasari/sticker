import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
} from "react"
import { useShallow } from "zustand/react/shallow"
import {
  PLOT_MIN,
  STICKER_SCALE_FIT_MAX,
  STICKER_SCALE_MAX,
  STICKER_SCALE_MIN,
  STICKER_SIZE_MAX,
  STICKER_SIZE_MIN,
  UNIT_SCALE,
  WALL_SIZE,
  type PlotCorner,
  type PlotHandle,
  clampPlotOrigin,
  containStickerSize,
  contentAspectRatio,
  isPlotFullyCovered,
  plotPrice,
  pxToUnits,
  resizePlotFromHandle,
  sizeParamFromContentUnits,
  snapPlotOrigin,
  stickerBoxSize,
} from "@/domain/types"
import { cn } from "@/lib/utils"
import { useWallStore } from "@/store/wall-store"
import { StickerSheet } from "./sticker-sheet"
import { WallControls, ZoomControls, ZoomScale } from "./wall-controls"
import {
  cancelCameraAnimation,
  clampCamera,
  clampZoom,
  defaultZoom,
  pinchTransform,
  zoomAtPoint,
} from "./camera"

type PlaceEditTarget = "area" | "sticker"
type GhostMode = "resize" | "rotate" | "scale" | "sticker-move" | "move"
type WallState = ReturnType<typeof useWallStore.getState>
type Placement = WallState["placements"][number]
type GetSticker = WallState["getSticker"]
type Pt = { x: number; y: number }

type Props = {
  placeMode?: boolean
  ghostSize?: number
  ghostW?: number
  ghostH?: number
  ghostUnitsW?: number
  ghostUnitsH?: number
  ghostStickerScale?: number
  /** Width ÷ height of the artwork (defaults to square). */
  ghostContentAspect?: number
  /** Sticker-mode size slider value (3–100 units). */
  ghostStickerSize?: number
  ghostRotation?: number
  ghostOffsetX?: number
  ghostOffsetY?: number
  ghostImage?: string | null
  /** When false, hide plot fill + grid (sticker mode). The plot outline still shows once pinned. */
  showPlotChrome?: boolean
  pinnedGhost?: { x: number; y: number } | null
  editTarget?: PlaceEditTarget
  onEditTarget?: (target: PlaceEditTarget) => void
  onPlace?: (x: number, y: number) => void
  onGhostMove?: (x: number, y: number) => void
  /** Area resize: new units + origin (8-handle). */
  onGhostResize?: (unitsW: number, unitsH: number, x: number, y: number) => void
  onGhostRotate?: (deg: number) => void
  onGhostStickerScale?: (scale: number) => void
  /**
   * Sticker-mode free size in units (3–100). `center` is the new world centre
   * that keeps the side opposite the dragged handle fixed.
   */
  onGhostStickerSize?: (size: number, center: Pt) => void
  onGhostStickerOffset?: (offsetX: number, offsetY: number) => void
  /** Called when a ghost transform gesture ends (snap / settle). */
  onGhostTransformEnd?: () => void
  hideControls?: boolean
  clearHeroZone?: boolean
  showPlaceZoom?: boolean
}

const TAP_SLOP_MOUSE = 3
const TAP_SLOP_TOUCH = 8
const EMPTY: Placement[] = []

function heroZoneScreen(viewportW: number, viewportH: number) {
  const w = Math.min(560, viewportW * 0.72)
  const h = Math.min(340, viewportH * 0.5)
  return {
    left: (viewportW - w) / 2,
    top: (viewportH - h) / 2,
    right: (viewportW + w) / 2,
    bottom: (viewportH + h) / 2,
  }
}

function placementOverlapsHeroZone(
  p: { x: number; y: number; width: number; height: number },
  camera: { x: number; y: number; zoom: number },
  viewportW: number,
  viewportH: number
) {
  const zone = heroZoneScreen(viewportW, viewportH)
  const left = (p.x - camera.x) * camera.zoom + viewportW / 2
  const top = (p.y - camera.y) * camera.zoom + viewportH / 2
  const right = left + p.width * camera.zoom
  const bottom = top + p.height * camera.zoom
  return !(
    right < zone.left ||
    left > zone.right ||
    bottom < zone.top ||
    top > zone.bottom
  )
}

function normalizeDeg(deg: number) {
  let d = ((deg % 360) + 360) % 360
  if (d > 180) d -= 360
  return d
}

function rotateVec(x: number, y: number, deg: number): Pt {
  const r = (deg * Math.PI) / 180
  const c = Math.cos(r)
  const s = Math.sin(r)
  return { x: x * c - y * s, y: x * s + y * c }
}

/** Snap to 45° steps when within 4° so "straight" is easy to hit by hand. */
function snapAngle(deg: number) {
  const nearest = Math.round(deg / 45) * 45
  return Math.abs(deg - nearest) < 4 ? nearest : deg
}

type EdgeHandle = Exclude<PlotHandle, PlotCorner>

const CORNERS: { id: PlotCorner; sx: -1 | 1; sy: -1 | 1; label: string }[] = [
  { id: "nw", sx: -1, sy: -1, label: "Resize from top left" },
  { id: "ne", sx: 1, sy: -1, label: "Resize from top right" },
  { id: "se", sx: 1, sy: 1, label: "Resize from bottom right" },
  { id: "sw", sx: -1, sy: 1, label: "Resize from bottom left" },
]

const EDGES: { id: EdgeHandle; nx: number; ny: number }[] = [
  { id: "n", nx: 0, ny: -1 },
  { id: "e", nx: 1, ny: 0 },
  { id: "s", nx: 0, ny: 1 },
  { id: "w", nx: -1, ny: 0 },
]

/** On-screen px, independent of camera zoom. */
const CORNER_HIT_PX = 22
const EDGE_HIT_PX = 10
const ROTATE_HIT_PX = 26

const RESIZE_CURSORS = ["ew-resize", "nwse-resize", "ns-resize", "nesw-resize"]

/** Resize cursor for a drag direction after the frame is rotated. */
function resizeCursor(dx: number, dy: number, rotationDeg: number) {
  const v = rotateVec(dx, dy, rotationDeg)
  const deg = (Math.atan2(v.y, v.x) * 180) / Math.PI
  const a = ((deg % 180) + 180) % 180
  return RESIZE_CURSORS[Math.round(a / 45) % 4]
}

const rotateCursorCache = new Map<number, string>()

/** Curved-arrow cursor; artwork hugs a top-left corner at 0°. */
function rotateCursor(deg: number) {
  const a = (((Math.round(deg / 15) * 15) % 360) + 360) % 360
  const hit = rotateCursorCache.get(a)
  if (hit) return hit
  const arc = "M6 15a9 9 0 0 1 9-9"
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'><g transform='rotate(${a} 12 12)'><path d='${arc}' fill='none' stroke='white' stroke-width='4' stroke-linecap='round'/><path d='${arc}' fill='none' stroke='black' stroke-width='1.6' stroke-linecap='round'/><path d='M2.8 13.5h6.4L6 18.5zM13.5 2.8v6.4L18.5 6z' fill='black' stroke='white' stroke-width='1' stroke-linejoin='round'/></g></svg>`
  const cursor = `url("data:image/svg+xml,${encodeURIComponent(svg)}") 12 12, crosshair`
  rotateCursorCache.set(a, cursor)
  return cursor
}

/** Zero-size anchor at (x, y) whose children keep a constant on-screen size. */
function Anchor({
  x,
  y,
  zoom,
  children,
}: {
  x: number
  y: number
  zoom: number
  children: ReactNode
}) {
  return (
    <div
      className="absolute h-0 w-0"
      style={{
        left: x,
        top: y,
        transform: `scale(${1 / zoom})`,
        transformOrigin: "0 0",
      }}
    >
      {children}
    </div>
  )
}

/**
 * Figma-style selection: outline, corner dots, invisible side strips with
 * resize cursors, and optional rotate zones just outside each corner.
 * Lives inside the (possibly rotated) frame it decorates.
 */
function SelectionChrome({
  w,
  h,
  zoom,
  rotation,
  onResize,
  onRotate,
}: {
  w: number
  h: number
  zoom: number
  rotation: number
  onResize: (handle: PlotHandle, e: React.PointerEvent) => void
  onRotate?: (e: React.PointerEvent) => void
}) {
  const edgeT = EDGE_HIT_PX / zoom
  const inset = CORNER_HIT_PX / 2 / zoom
  const spanW = Math.max(0, w - 2 * inset)
  const spanH = Math.max(0, h - 2 * inset)
  const edgeRect: Record<EdgeHandle, React.CSSProperties> = {
    n: { left: inset, top: -edgeT / 2, width: spanW, height: edgeT },
    s: { left: inset, top: h - edgeT / 2, width: spanW, height: edgeT },
    w: { left: -edgeT / 2, top: inset, width: edgeT, height: spanH },
    e: { left: w - edgeT / 2, top: inset, width: edgeT, height: spanH },
  }
  const at = (c: (typeof CORNERS)[number]) => ({
    x: ((c.sx + 1) / 2) * w,
    y: ((c.sy + 1) / 2) * h,
  })
  const cornerDeg = (c: (typeof CORNERS)[number]) => {
    const v = rotateVec(c.sx * w, c.sy * h, rotation)
    return (Math.atan2(v.y, v.x) * 180) / Math.PI
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10"
      style={{ outline: `${1.5 / zoom}px solid rgba(14,165,233,0.95)` }}
    >
      {onRotate
        ? CORNERS.map((c) => {
            const p = at(c)
            return (
              <Anchor key={`rotate-${c.id}`} x={p.x} y={p.y} zoom={zoom}>
                <div
                  aria-hidden
                  onPointerDown={onRotate}
                  className="pointer-events-auto absolute touch-none"
                  style={{
                    width: ROTATE_HIT_PX,
                    height: ROTATE_HIT_PX,
                    left: c.sx < 0 ? 4 - ROTATE_HIT_PX : -4,
                    top: c.sy < 0 ? 4 - ROTATE_HIT_PX : -4,
                    cursor: rotateCursor(cornerDeg(c) + 135),
                  }}
                />
              </Anchor>
            )
          })
        : null}
      {EDGES.map((edge) => (
        <div
          key={edge.id}
          aria-hidden
          onPointerDown={(e) => onResize(edge.id, e)}
          className="pointer-events-auto absolute touch-none"
          style={{
            ...edgeRect[edge.id],
            cursor: resizeCursor(edge.nx, edge.ny, rotation),
          }}
        />
      ))}
      {CORNERS.map((c) => {
        const p = at(c)
        return (
          <Anchor key={c.id} x={p.x} y={p.y} zoom={zoom}>
            <button
              type="button"
              aria-label={c.label}
              onPointerDown={(e) => onResize(c.id, e)}
              className="pointer-events-auto absolute grid -translate-x-1/2 -translate-y-1/2 touch-none place-items-center focus-visible:outline-none"
              style={{
                width: CORNER_HIT_PX,
                height: CORNER_HIT_PX,
                cursor: resizeCursor(c.sx * w, c.sy * h, rotation),
              }}
            >
              <span className="size-2.5 rounded-[2px] border-[1.5px] border-sky-500 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]" />
            </button>
          </Anchor>
        )
      })}
    </div>
  )
}

/**
 * Memoised so camera changes (every pointer move while panning) only update the
 * transform on the parent, not every placement node.
 */
const PlacementLayer = memo(function PlacementLayer({
  placements,
  visible,
  selectedId,
  interactive,
  getSticker,
  onKeyboardSelect,
}: {
  placements: Placement[]
  visible: Placement[]
  selectedId: string | null | undefined
  interactive: boolean
  getSticker: GetSticker
  onKeyboardSelect: (id: string) => void
}) {
  const covered = useMemo(() => {
    const ids = new Set<string>()
    for (const p of visible) {
      if (isPlotFullyCovered(p, placements)) ids.add(p.id)
    }
    return ids
  }, [visible, placements])

  // Natural aspect for stickers that predate widthPx/heightPx persistence.
  const [aspectById, setAspectById] = useState<Record<string, number>>({})

  return (
    <>
      {visible.map((p) => {
        const sticker = getSticker(p.stickerId)
        if (!sticker || covered.has(p.id)) return null
        const active = p.id === selectedId
        const rot = p.rotation ?? 0
        const scale = p.stickerScale ?? 1
        const ox = p.stickerOffsetX ?? 0
        const oy = p.stickerOffsetY ?? 0
        const aspect =
          aspectById[sticker.id] ??
          contentAspectRatio(sticker.widthPx, sticker.heightPx)
        const box = stickerBoxSize(p.width, p.height, scale, aspect)
        const onImgLoad = (e: SyntheticEvent<HTMLImageElement>) => {
          if (sticker.widthPx && sticker.heightPx) return
          const { naturalWidth: w, naturalHeight: h } = e.currentTarget
          if (w > 0 && h > 0) {
            setAspectById((prev) =>
              prev[sticker.id] === w / h
                ? prev
                : { ...prev, [sticker.id]: w / h }
            )
          }
        }
        return (
          <button
            key={p.id}
            type="button"
            data-placement-id={p.id}
            className="absolute overflow-hidden bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
            style={{
              left: p.x,
              top: p.y,
              width: p.width,
              height: p.height,
              zIndex: p.zIndex,
            }}
            // Pointer taps are handled by the wall; this only serves keyboard users
            // (a keyboard-generated click has detail === 0).
            onClick={(e) => {
              if (interactive && e.detail === 0) onKeyboardSelect(p.id)
            }}
            aria-label={sticker.name}
          >
            <span className="pointer-events-none absolute inset-0">
              <img
                src={sticker.imageDataUrl}
                alt=""
                draggable={false}
                decoding="async"
                onLoad={onImgLoad}
                className="absolute top-1/2 left-1/2 max-w-none object-fill"
                style={{
                  width: box.w,
                  height: box.h,
                  transform: `translate(calc(-50% + ${ox}px), calc(-50% + ${oy}px)) rotate(${rot}deg)${active ? " scale(1.04)" : ""}`,
                  transformOrigin: "center center",
                }}
              />
            </span>
          </button>
        )
      })}
    </>
  )
})

export function StickerWall({
  placeMode,
  ghostSize = 30,
  ghostW,
  ghostH,
  ghostUnitsW = PLOT_MIN,
  ghostUnitsH = PLOT_MIN,
  ghostStickerScale = 1,
  ghostContentAspect = 1,
  ghostStickerSize = STICKER_SIZE_MIN,
  ghostRotation = 0,
  ghostOffsetX = 0,
  ghostOffsetY = 0,
  ghostImage,
  showPlotChrome = true,
  pinnedGhost,
  editTarget = "area",
  onEditTarget: _onEditTarget,
  onPlace,
  onGhostMove,
  onGhostResize,
  onGhostRotate,
  onGhostStickerScale,
  onGhostStickerSize,
  onGhostStickerOffset,
  onGhostTransformEnd,
  hideControls,
  clearHeroZone,
  showPlaceZoom,
}: Props) {
  const placeW = ghostW ?? ghostSize
  const placeH = ghostH ?? ghostSize
  const contentAspect =
    ghostContentAspect > 0 && Number.isFinite(ghostContentAspect)
      ? ghostContentAspect
      : 1
  const stickerScale = Math.min(
    STICKER_SCALE_FIT_MAX,
    Math.max(STICKER_SCALE_MIN, ghostStickerScale)
  )

  const viewportRef = useRef<HTMLDivElement>(null)
  const fitted = useRef(false)

  // --- pan / pinch / tap gesture state (Pointer Events only; no touch events) ---
  const pointers = useRef(new Map<number, Pt>())
  const gesture = useRef({
    moved: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    pinchDist: 0,
    pinchMid: { x: 0, y: 0 } as Pt,
  })

  // --- ghost (pinned sticker) drag state ---
  const ghostDrag = useRef<boolean>(false)
  // Latest callbacks/geometry for window-level drag listeners (avoids stale closures).
  const live = useRef({
    onGhostMove,
    onGhostResize,
    onGhostRotate,
    onGhostStickerScale,
    onGhostStickerSize,
    onGhostStickerOffset,
    onGhostTransformEnd,
    placeW,
    placeH,
    contentAspect,
    editTarget,
    stickerSize: ghostStickerSize,
  })
  useLayoutEffect(() => {
    live.current = {
      onGhostMove,
      onGhostResize,
      onGhostRotate,
      onGhostStickerScale,
      onGhostStickerSize,
      onGhostStickerOffset,
      onGhostTransformEnd,
      placeW,
      placeH,
      contentAspect,
      editTarget,
      stickerSize: ghostStickerSize,
    }
  })

  const [grabbing, setGrabbing] = useState(false)
  const [viewportSize, setViewportSize] = useState({ w: 1440, h: 900 })
  const [ghostCenter, setGhostCenter] = useState<Pt | null>(null)
  /** Sticker mode selection: click or drag selects, click outside / Esc clears. */
  const [ghostSelected, setGhostSelected] = useState(true)
  /** Active ghost gesture; drives which layers animate. */
  const [dragMode, setDragMode] = useState<GhostMode | null>(null)

  const hydrate = useWallStore((s) => s.hydrate)
  const hydrated = useWallStore((s) => s.hydrated)
  const camera = useWallStore(useShallow((s) => s.camera))
  const setCamera = useWallStore((s) => s.setCamera)
  const rawPlacements = useWallStore((s) => s.placements)
  const selectedPlacementId = useWallStore((s) => s.selectedPlacementId)
  const selectPlacement = useWallStore((s) => s.selectPlacement)
  const getSticker = useWallStore((s) => s.getSticker)

  const placements = useMemo(
    () => [...rawPlacements].sort((a, b) => a.zIndex - b.zIndex),
    [rawPlacements]
  )

  const visiblePlacements = useMemo(() => {
    if (!hydrated) return EMPTY
    if (!clearHeroZone) return placements
    return placements.filter(
      (p) =>
        !placementOverlapsHeroZone(p, camera, viewportSize.w, viewportSize.h)
    )
  }, [hydrated, placements, clearHeroZone, camera, viewportSize])

  const topZ = useMemo(
    () => placements.reduce((m, p) => Math.max(m, p.zIndex), 0) + 1,
    [placements]
  )

  const editMode = Boolean(placeMode && pinnedGhost)
  const ghostPos = useMemo(() => {
    const unitsW = pxToUnits(placeW)
    const unitsH = pxToUnits(placeH)
    if (pinnedGhost) {
      // Live edits stay unsnapped so motion is continuous; the parent snaps on release.
      return clampPlotOrigin(pinnedGhost.x, pinnedGhost.y, unitsW, unitsH)
    }
    if (!placeMode || !ghostCenter) return null
    return snapPlotOrigin(
      ghostCenter.x - placeW / 2,
      ghostCenter.y - placeH / 2,
      unitsW,
      unitsH
    )
  }, [ghostCenter, pinnedGhost, placeMode, placeW, placeH])

  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Measure viewport, fit on first layout, re-clamp on resize / rotation.
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const measure = () => {
      const { width: w, height: h } = el.getBoundingClientRect()
      setViewportSize({ w, h })
      if (w <= 0 || h <= 0) return
      const state = useWallStore.getState()
      if (!fitted.current) {
        fitted.current = true
        state.setCamera({
          x: WALL_SIZE / 2,
          y: WALL_SIZE / 2,
          zoom: defaultZoom(w, h),
        })
        return
      }
      const c = state.camera
      const zoom = clampZoom(c.zoom, w, h)
      const next = clampCamera(c.x, c.y, zoom, w, h)
      if (next.x !== c.x || next.y !== c.y || zoom !== c.zoom)
        state.setCamera({ ...next, zoom })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Re-rasterize at the final scale once the camera settles.
  const [cameraMoving, setCameraMoving] = useState(false)
  useEffect(() => {
    let timer: number | undefined
    const unsubscribe = useWallStore.subscribe((s, prev) => {
      if (s.camera === prev.camera) return
      setCameraMoving(true)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setCameraMoving(false), 160)
    })
    return () => {
      unsubscribe()
      window.clearTimeout(timer)
    }
  }, [])

  // Re-select whenever a new spot is pinned or the edit target switches.
  const hasPinned = pinnedGhost != null
  const selectKey = `${hasPinned}|${editTarget}`
  const [prevSelectKey, setPrevSelectKey] = useState(selectKey)
  if (prevSelectKey !== selectKey) {
    setPrevSelectKey(selectKey)
    setGhostSelected(true)
  }

  useEffect(() => {
    if (!hasPinned) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return
      const t = e.target as HTMLElement | null
      if (t?.closest("input, textarea, select, [contenteditable]")) return
      setGhostSelected(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [hasPinned])

  function clientToWorld(clientX: number, clientY: number): Pt | null {
    const el = viewportRef.current
    if (!el) return null
    const cam = useWallStore.getState().camera
    const rect = el.getBoundingClientRect()
    return {
      x: cam.x + (clientX - rect.left - rect.width / 2) / cam.zoom,
      y: cam.y + (clientY - rect.top - rect.height / 2) / cam.zoom,
    }
  }

  // Wheel / trackpad pinch zoom (needs a non-passive listener to preventDefault).
  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (clearHeroZone) return
      e.preventDefault()
      cancelCameraAnimation()
      const raw = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY
      const dy = Math.max(-120, Math.min(120, raw))
      // ctrlKey = trackpad pinch (small deltas, needs a bigger multiplier)
      const factor = Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018))
      const cam = useWallStore.getState().camera
      zoomAtPoint(
        el.getBoundingClientRect(),
        e.clientX,
        e.clientY,
        cam.zoom * factor
      )
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => el.removeEventListener("wheel", onWheel)
  }, [clearHeroZone])

  // ---------------------------------------------------------------------------
  // Ghost drag: window-level listeners so one drag = one handler, never fights
  // with the wall's pan, and keeps working if the pointer leaves the element.
  // ---------------------------------------------------------------------------
  function beginGhostDrag(
    mode: GhostMode,
    e: React.PointerEvent,
    handle?: PlotHandle
  ) {
    if (!ghostPos || !pinnedGhost) return
    if (e.pointerType === "mouse" && e.button !== 0) return
    e.stopPropagation()
    e.preventDefault()
    cancelCameraAnimation()
    if (editTarget === "sticker") setGhostSelected(true)

    const cx = ghostPos.x + placeW / 2 + ghostOffsetX
    const cy = ghostPos.y + placeH / 2 + ghostOffsetY
    const world = clientToWorld(e.clientX, e.clientY) ?? { x: cx, y: cy }
    const originBox = stickerBoxSize(
      placeW,
      placeH,
      stickerScale,
      contentAspect
    )
    // Scale pivots on the opposite corner / side (Figma-style) and measures
    // progress along the anchor→handle axis, so dragging past the anchor
    // bottoms out at the minimum instead of growing again.
    let anchor: Pt = { x: cx, y: cy }
    let axis: Pt = { x: 0, y: -1 }
    if (handle) {
      const corner = CORNERS.find((c) => c.id === handle)
      const edge = EDGES.find((ed) => ed.id === handle)
      const dir = corner
        ? { x: corner.sx, y: corner.sy }
        : { x: edge?.nx ?? 0, y: edge?.ny ?? -1 }
      const half = rotateVec(
        (dir.x * originBox.w) / 2,
        (dir.y * originBox.h) / 2,
        ghostRotation
      )
      anchor = { x: cx - half.x, y: cy - half.y }
      const len = Math.hypot(half.x, half.y) || 1
      axis = { x: half.x / len, y: half.y / len }
    }
    const startProj = Math.max(
      1,
      (world.x - anchor.x) * axis.x + (world.y - anchor.y) * axis.y
    )
    const d = {
      mode,
      handle,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: ghostPos.x,
      originY: ghostPos.y,
      originUnitsW: ghostUnitsW,
      originUnitsH: ghostUnitsH,
      originOffsetX: ghostOffsetX,
      originOffsetY: ghostOffsetY,
      // Absolute sticker box at drag start (aspect-correct).
      originBoxW: originBox.w,
      originBoxH: originBox.h,
      originSize: ghostStickerSize,
      moved: false,
      cx,
      cy,
      anchor,
      axis,
      startProj,
      originRotation: ghostRotation,
      startAngle: Math.atan2(world.y - cy, world.x - cx),
    }

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== d.pointerId) return
      ev.preventDefault()
      const cam = useWallStore.getState().camera
      const dx = (ev.clientX - d.startX) / cam.zoom
      const dy = (ev.clientY - d.startY) / cam.zoom
      if (
        !d.moved &&
        Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY) > 3
      ) {
        d.moved = true
      }
      const cb = live.current

      if (d.mode === "move" && cb.onGhostMove) {
        cb.onGhostMove(d.originX + dx, d.originY + dy)
      } else if (d.mode === "sticker-move" && cb.onGhostStickerOffset) {
        cb.onGhostStickerOffset(d.originOffsetX + dx, d.originOffsetY + dy)
      } else if (d.mode === "resize" && d.handle && cb.onGhostResize) {
        const next = resizePlotFromHandle(
          d.handle,
          d.originX,
          d.originY,
          d.originUnitsW,
          d.originUnitsH,
          dx,
          dy
        )
        if (next) cb.onGhostResize(next.unitsW, next.unitsH, next.x, next.y)
      } else if (d.mode === "scale") {
        const w = clientToWorld(ev.clientX, ev.clientY)
        if (!w) return
        // Uniform scale (aspect locked) about the opposite corner / side.
        const proj =
          (w.x - d.anchor.x) * d.axis.x + (w.y - d.anchor.y) * d.axis.y
        const ratio = Math.max(0, proj) / d.startProj
        if (cb.editTarget === "sticker" && cb.onGhostStickerSize) {
          const startSize = sizeParamFromContentUnits(
            d.originBoxW / UNIT_SCALE,
            d.originBoxH / UNIT_SCALE
          )
          const size = Math.min(
            STICKER_SIZE_MAX,
            Math.max(STICKER_SIZE_MIN, startSize * ratio)
          )
          // Use the clamped ratio so the anchor stays put at the size limits.
          const k = size / startSize
          cb.onGhostStickerSize(size, {
            x: d.anchor.x + (d.cx - d.anchor.x) * k,
            y: d.anchor.y + (d.cy - d.anchor.y) * k,
          })
        } else if (cb.onGhostStickerScale) {
          const full = containStickerSize(
            cb.placeW,
            cb.placeH,
            cb.contentAspect
          )
          const next = (d.originBoxW * ratio) / Math.max(1e-9, full.w)
          cb.onGhostStickerScale(
            Math.min(STICKER_SCALE_MAX, Math.max(STICKER_SCALE_MIN, next))
          )
        }
      } else if (d.mode === "rotate" && cb.onGhostRotate) {
        const w = clientToWorld(ev.clientX, ev.clientY)
        if (!w) return
        const delta =
          ((Math.atan2(w.y - d.cy, w.x - d.cx) - d.startAngle) * 180) / Math.PI
        const deg = normalizeDeg(d.originRotation + delta)
        cb.onGhostRotate(normalizeDeg(snapAngle(deg)))
      }
    }
    const end = (ev: PointerEvent) => {
      if (ev.pointerId !== d.pointerId) return
      ghostDrag.current = false
      setDragMode(null)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", end)
      window.removeEventListener("pointercancel", end)
      if (
        d.moved ||
        d.mode === "scale" ||
        d.mode === "resize" ||
        d.mode === "rotate"
      ) {
        live.current.onGhostTransformEnd?.()
      }
    }
    ghostDrag.current = true
    setDragMode(mode)
    window.addEventListener("pointermove", move, { passive: false })
    window.addEventListener("pointerup", end)
    window.addEventListener("pointercancel", end)
  }

  // ---------------------------------------------------------------------------
  // Wall gestures: one finger/mouse pans, two fingers pinch + pan, tap places or
  // selects. Pointer capture is taken only once a drag starts, so a plain tap
  // still reports the real element under the pointer.
  // ---------------------------------------------------------------------------
  function handleTap(clientX: number, clientY: number) {
    if (placeMode) {
      if (editMode) {
        // Click outside the sticker deselects it, like Figma.
        setGhostSelected(false)
        return
      }
      if (onPlace) {
        const world = clientToWorld(clientX, clientY)
        if (!world) return
        const pos = snapPlotOrigin(
          world.x - placeW / 2,
          world.y - placeH / 2,
          pxToUnits(placeW),
          pxToUnits(placeH)
        )
        onPlace(pos.x, pos.y)
      }
      return
    }
    const hit = document
      .elementFromPoint(clientX, clientY)
      ?.closest<HTMLElement>("[data-placement-id]")
    selectPlacement(hit?.dataset.placementId ?? null)
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (clearHeroZone || ghostDrag.current) return
    if (e.pointerType === "mouse" && e.button !== 0) return
    cancelCameraAnimation()
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current

    if (pointers.current.size === 1) {
      g.moved = false
      g.startX = g.lastX = e.clientX
      g.startY = g.lastY = e.clientY
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      g.moved = true // a second finger can never be a tap
      g.pinchDist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))
      g.pinchMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      setGrabbing(true)
    }

    if (placeMode && !editMode && e.pointerType === "mouse") {
      const world = clientToWorld(e.clientX, e.clientY)
      if (world) setGhostCenter(world)
    }
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (clearHeroZone || ghostDrag.current) return
    const p = pointers.current.get(e.pointerId)

    // Mouse hover (no button down): the ghost follows the cursor. Touch has no hover.
    if (!p) {
      if (placeMode && !editMode && e.pointerType === "mouse") {
        const world = clientToWorld(e.clientX, e.clientY)
        if (world) setGhostCenter(world)
      }
      return
    }
    p.x = e.clientX
    p.y = e.clientY
    const g = gesture.current
    const el = viewportRef.current
    if (!el) return

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.max(1, Math.hypot(a.x - b.x, a.y - b.y))
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      pinchTransform(
        el.getBoundingClientRect(),
        g.pinchMid,
        mid,
        dist / g.pinchDist
      )
      g.pinchDist = dist
      g.pinchMid = mid
      return
    }

    if (!g.moved) {
      const slop = e.pointerType === "mouse" ? TAP_SLOP_MOUSE : TAP_SLOP_TOUCH
      if (Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < slop) return
      g.moved = true
      setGrabbing(true)
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    const dx = e.clientX - g.lastX
    const dy = e.clientY - g.lastY
    g.lastX = e.clientX
    g.lastY = e.clientY
    const cam = useWallStore.getState().camera
    setCamera(
      clampCamera(
        cam.x - dx / cam.zoom,
        cam.y - dy / cam.zoom,
        cam.zoom,
        viewportSize.w,
        viewportSize.h
      )
    )

    if (placeMode && !editMode && e.pointerType === "mouse") {
      const world = clientToWorld(e.clientX, e.clientY)
      if (world) setGhostCenter(world)
    }
  }

  function endPointer(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(e.pointerId)) return
    const g = gesture.current
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }

    if (pointers.current.size === 1) {
      // Pinch -> pan hand-off: rebase on the finger that stayed down so the
      // wall doesn't jump.
      const [rest] = [...pointers.current.values()]
      g.lastX = rest.x
      g.lastY = rest.y
      g.moved = true
    } else if (pointers.current.size === 0) {
      setGrabbing(false)
      if (e.type === "pointerup" && !g.moved && !clearHeroZone) {
        handleTap(e.clientX, e.clientY)
      }
    }
  }

  const selected = placements.find((p) => p.id === selectedPlacementId)
  const selectedSticker = selected ? getSticker(selected.stickerId) : undefined

  // Plot chrome (fill + grid) only in area mode. Sticker mode shows the artwork
  // plus a quiet outline of the plot you're paying for.
  const showAreaChrome = Boolean(
    placeMode && ghostPos && showPlotChrome && editMode && editTarget === "area"
  )

  // Ghost geometry (all in plot-local world px) — aspect-correct, no letterbox pad.
  const z = camera.zoom
  const stickerBox = stickerBoxSize(placeW, placeH, stickerScale, contentAspect)
  const boxW = stickerBox.w
  const boxH = stickerBox.h
  const stickerMode = editTarget === "sticker"
  // Sticker mode: the artwork owns the pointer; the plot is just an outline.
  const stickerInteractive = editMode && stickerMode && Boolean(ghostImage)
  const plotInteractive = editMode && !stickerInteractive
  // Plot outline eases between whole-unit sizes; skip while dragging it freely.
  const animatePlot = editMode && stickerMode && dragMode !== "move"
  // Sticker eases only when settling (grid snap after release, slider edits).
  const animateSticker = editMode && dragMode == null
  const plotLayerClass = cn(
    "absolute",
    animatePlot &&
      "transition-[left,top,width,height] duration-150 ease-out motion-reduce:transition-none"
  )
  const plotLayerStyle = ghostPos
    ? { left: ghostPos.x, top: ghostPos.y, width: placeW, height: placeH }
    : undefined

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden overscroll-none bg-white">
      <div
        ref={viewportRef}
        className="absolute inset-0 touch-none select-none"
        style={{
          cursor: clearHeroZone
            ? "default"
            : placeMode && !editMode
              ? "crosshair"
              : grabbing
                ? "grabbing"
                : "grab",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={(e) => {
          if (
            e.pointerType === "mouse" &&
            placeMode &&
            !editMode &&
            pointers.current.size === 0
          ) {
            setGhostCenter(null)
          }
        }}
      >
        <div
          className="absolute top-1/2 left-1/2 origin-center"
          style={{
            // Only promote while moving: a will-change layer is rasterized once
            // and then stretched, which blurs art and text at high zoom.
            willChange: cameraMoving ? "transform" : undefined,
            width: WALL_SIZE,
            height: WALL_SIZE,
            transform: `translate(-50%, -50%) translate(${(WALL_SIZE / 2 - camera.x) * camera.zoom}px, ${(WALL_SIZE / 2 - camera.y) * camera.zoom}px) scale(${camera.zoom})`,
          }}
        >
          <div className="absolute inset-0 bg-white" aria-hidden />

          {showAreaChrome ? (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.07) 1px, transparent 1px)",
                backgroundSize: `${UNIT_SCALE}px ${UNIT_SCALE}px`,
              }}
              aria-hidden
            />
          ) : null}

          <div className="absolute inset-0">
            <PlacementLayer
              placements={placements}
              visible={visiblePlacements}
              selectedId={selectedPlacementId}
              interactive={!placeMode}
              getSticker={getSticker}
              onKeyboardSelect={selectPlacement}
            />

            {placeMode && ghostPos ? (
              <>
                {/* Plot base: area fill + grid sit beneath the artwork. */}
                {showAreaChrome ? (
                  <div
                    aria-hidden
                    className={cn(plotLayerClass, "pointer-events-none")}
                    style={{ ...plotLayerStyle, zIndex: topZ + 9 }}
                  >
                    <div className="absolute inset-0 bg-sky-400/20" />
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage:
                          "linear-gradient(to right, rgba(0,0,0,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.12) 1px, transparent 1px)",
                        backgroundSize: `${UNIT_SCALE}px ${UNIT_SCALE}px`,
                      }}
                    />
                  </div>
                ) : null}

                {/* Artwork, anchored at its own world centre so plot snapping never drags it. */}
                {ghostImage ? (
                  <div
                    className={cn(
                      "absolute h-0 w-0",
                      animateSticker &&
                        "transition-[left,top] duration-200 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none"
                    )}
                    style={{
                      left: ghostPos.x + placeW / 2 + ghostOffsetX,
                      top: ghostPos.y + placeH / 2 + ghostOffsetY,
                      zIndex: topZ + 10,
                    }}
                  >
                    <div
                      className="absolute"
                      style={{
                        left: -boxW / 2,
                        top: -boxH / 2,
                        width: boxW,
                        height: boxH,
                        transform: `rotate(${ghostRotation}deg)`,
                        transformOrigin: "center center",
                        pointerEvents: stickerInteractive ? "auto" : "none",
                        cursor: stickerInteractive ? "move" : undefined,
                        touchAction: "none",
                      }}
                      onPointerDown={
                        stickerInteractive
                          ? (e) => beginGhostDrag("move", e)
                          : undefined
                      }
                    >
                      <img
                        src={ghostImage}
                        alt=""
                        draggable={false}
                        decoding="async"
                        className="pointer-events-none absolute inset-0 size-full max-w-none object-fill"
                        style={{ opacity: editMode ? 1 : 0.92 }}
                      />
                      {stickerInteractive && ghostSelected ? (
                        <SelectionChrome
                          w={boxW}
                          h={boxH}
                          zoom={z}
                          rotation={ghostRotation}
                          onResize={(handle, e) =>
                            beginGhostDrag("scale", e, handle)
                          }
                          onRotate={(e) => beginGhostDrag("rotate", e)}
                        />
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {/* Plot top: outline, plus area-mode drag + resize handles. */}
                {editMode ? (
                  <div
                    className={plotLayerClass}
                    style={{
                      ...plotLayerStyle,
                      zIndex: topZ + 11,
                      pointerEvents: plotInteractive ? "auto" : "none",
                      cursor: plotInteractive
                        ? stickerMode
                          ? "move"
                          : "grab"
                        : undefined,
                      touchAction: "none",
                    }}
                    // Area mode: drag inside the plot nudges the sticker within it.
                    onPointerDown={
                      plotInteractive
                        ? (e) =>
                            beginGhostDrag(
                              stickerMode ? "move" : "sticker-move",
                              e
                            )
                        : undefined
                    }
                  >
                    {stickerMode ? (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                          outline: `${1.5 / z}px dashed rgba(0,0,0,0.28)`,
                        }}
                      />
                    ) : (
                      <SelectionChrome
                        w={placeW}
                        h={placeH}
                        zoom={z}
                        rotation={0}
                        onResize={(handle, e) =>
                          beginGhostDrag("resize", e, handle)
                        }
                      />
                    )}
                    {/* Figma-style size badge: what this selection costs. */}
                    {!stickerMode || ghostSelected ? (
                      <Anchor x={placeW / 2} y={placeH} zoom={z}>
                        <div
                          aria-live="polite"
                          className="pointer-events-none absolute top-2 left-0 -translate-x-1/2 rounded-[5px] bg-sky-500 px-1.5 py-[3px] font-ui text-[11px] leading-none font-semibold whitespace-nowrap text-white tabular-nums shadow-sm"
                        >
                          {ghostUnitsW} × {ghostUnitsH} = $
                          {plotPrice(ghostUnitsW, ghostUnitsH).toLocaleString()}
                        </div>
                      </Anchor>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {placeMode && showPlaceZoom ? (
        <>
          <ZoomControls />
          <ZoomScale />
        </>
      ) : null}

      <div data-ui-chrome className="contents">
        {!placeMode && !hideControls ? <WallControls /> : null}
        {!placeMode && !clearHeroZone && selected && selectedSticker ? (
          <StickerSheet
            sticker={selectedSticker}
            placement={selected}
            onClose={() => selectPlacement(null)}
          />
        ) : null}
      </div>
    </div>
  )
}
