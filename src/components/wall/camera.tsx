import {
  DEFAULT_VIEW_UNITS,
  UNIT_SCALE,
  WALL_SIZE,
  coverZoom,
} from "@/domain/types"
import { useWallStore } from "@/store/wall-store"

export const ZOOM_MAX = 8

export type Camera = { x: number; y: number; zoom: number }

function windowSize() {
  if (typeof window === "undefined") return { w: WALL_SIZE, h: WALL_SIZE }
  return { w: window.innerWidth, h: window.innerHeight }
}

/** Furthest zoom-out: the wall still covers the viewport (no empty gutters). */
export function minZoom(viewportW?: number, viewportH?: number) {
  const fallback = windowSize()
  return coverZoom(viewportW ?? fallback.w, viewportH ?? fallback.h)
}

export function clampZoom(
  zoom: number,
  viewportW?: number,
  viewportH?: number
) {
  const min = minZoom(viewportW, viewportH)
  return Math.min(Math.max(ZOOM_MAX, min), Math.max(min, zoom))
}

/** Starting zoom: DEFAULT_VIEW_UNITS of wall fill the viewport height. */
export function defaultZoom(viewportW: number, viewportH: number) {
  return clampZoom(
    viewportH / (DEFAULT_VIEW_UNITS * UNIT_SCALE),
    viewportW,
    viewportH
  )
}

export function clampCamera(
  x: number,
  y: number,
  zoom: number,
  viewportW: number,
  viewportH: number
) {
  const halfW = viewportW / (2 * zoom)
  const halfH = viewportH / (2 * zoom)
  const minX = halfW
  const minY = halfH
  const maxX = WALL_SIZE - halfW
  const maxY = WALL_SIZE - halfH
  return {
    // If the viewport is momentarily larger than the wall, centre it.
    x: minX > maxX ? WALL_SIZE / 2 : Math.min(Math.max(minX, x), maxX),
    y: minY > maxY ? WALL_SIZE / 2 : Math.min(Math.max(minY, y), maxY),
  }
}

type Rect = { left: number; top: number; width: number; height: number }

/** Zoom so the world point under (clientX, clientY) stays put. */
export function zoomAtPoint(
  rect: Rect,
  clientX: number,
  clientY: number,
  nextZoom: number
) {
  const { camera: cam, setCamera } = useWallStore.getState()
  const mx = clientX - rect.left - rect.width / 2
  const my = clientY - rect.top - rect.height / 2
  const z = clampZoom(nextZoom, rect.width, rect.height)
  const worldX = cam.x + mx / cam.zoom
  const worldY = cam.y + my / cam.zoom
  const next = clampCamera(
    worldX - mx / z,
    worldY - my / z,
    z,
    rect.width,
    rect.height
  )
  setCamera({ zoom: z, x: next.x, y: next.y })
}

/**
 * Pinch: keep the world point that was under the previous midpoint under the
 * new midpoint (zoom + pan in one step, so two-finger drag also pans).
 */
export function pinchTransform(
  rect: Rect,
  prevMid: { x: number; y: number },
  mid: { x: number; y: number },
  scale: number
) {
  const { camera: cam, setCamera } = useWallStore.getState()
  const z = clampZoom(cam.zoom * scale, rect.width, rect.height)
  const px = prevMid.x - rect.left - rect.width / 2
  const py = prevMid.y - rect.top - rect.height / 2
  const worldX = cam.x + px / cam.zoom
  const worldY = cam.y + py / cam.zoom
  const nx = mid.x - rect.left - rect.width / 2
  const ny = mid.y - rect.top - rect.height / 2
  const next = clampCamera(
    worldX - nx / z,
    worldY - ny / z,
    z,
    rect.width,
    rect.height
  )
  setCamera({ zoom: z, x: next.x, y: next.y })
}

let rafId = 0

export function cancelCameraAnimation() {
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
}

/** Smoothly move the camera. Any user gesture should call cancelCameraAnimation(). */
export function animateCamera(target: Partial<Camera>, duration = 320) {
  cancelCameraAnimation()
  const { camera: from, setCamera } = useWallStore.getState()
  const to: Camera = {
    x: target.x ?? from.x,
    y: target.y ?? from.y,
    zoom: target.zoom ?? from.zoom,
  }
  const reduce =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  if (reduce || duration <= 0) {
    setCamera(to)
    return
  }
  const t0 = performance.now()
  const tick = (now: number) => {
    const t = Math.min(1, (now - t0) / duration)
    const e = 1 - Math.pow(1 - t, 3)
    setCamera({
      x: from.x + (to.x - from.x) * e,
      y: from.y + (to.y - from.y) * e,
      // geometric interpolation feels linear to the eye
      zoom: from.zoom * Math.pow(to.zoom / from.zoom, e),
    })
    rafId = t < 1 ? requestAnimationFrame(tick) : 0
  }
  rafId = requestAnimationFrame(tick)
}

/** Button zoom: scale around the viewport centre, always clamped. */
export function zoomBy(factor: number) {
  const { camera: cam } = useWallStore.getState()
  const { w, h } = windowSize()
  const zoom = clampZoom(cam.zoom * factor, w, h)
  const c = clampCamera(cam.x, cam.y, zoom, w, h)
  animateCamera({ zoom, x: c.x, y: c.y }, 180)
}

let lastExploreId: string | null = null

/**
 * Fly to somewhere new on every call: a different sticker while there are
 * unvisited ones nearby in the shuffle, otherwise a random patch of wall.
 */
export function exploreRandom() {
  const { placements, camera } = useWallStore.getState()
  const { w, h } = windowSize()
  const zoom = defaultZoom(w, h)
  const pool = placements.filter((p) => p.id !== lastExploreId)
  let x: number
  let y: number
  if (pool.length && Math.random() < 0.75) {
    const p = pool[Math.floor(Math.random() * pool.length)]!
    lastExploreId = p.id
    x = p.x + p.width / 2
    y = p.y + p.height / 2
  } else {
    lastExploreId = null
    // Land at least a screen away so the move always reads as a new area.
    const minJump = Math.max(w, h) / zoom
    let tries = 0
    do {
      x = Math.random() * WALL_SIZE
      y = Math.random() * WALL_SIZE
      tries++
    } while (Math.hypot(x - camera.x, y - camera.y) < minJump && tries < 12)
  }
  const c = clampCamera(x, y, zoom, w, h)
  animateCamera({ x: c.x, y: c.y, zoom }, 700)
}

export function fitWall() {
  const { w, h } = windowSize()
  animateCamera({ x: WALL_SIZE / 2, y: WALL_SIZE / 2, zoom: coverZoom(w, h) })
}
