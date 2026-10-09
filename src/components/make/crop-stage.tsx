import { useEffect, useRef, useState } from "react"
import { motion } from "motion/react"
import {
  type CropHandle,
  type CropRect,
  type ImageEdit,
  type Size,
  dragCrop,
  nudgeCrop,
  orientedSize,
  straightenScale,
} from "@/lib/image-edit"
import { cn } from "@/lib/utils"

const EASE_OUT = [0.23, 1, 0.32, 1] as const

const CORNERS: { id: CropHandle; className: string }[] = [
  {
    id: "nw",
    className: "top-0 left-0 cursor-nwse-resize border-t-[3px] border-l-[3px]",
  },
  {
    id: "ne",
    className: "top-0 right-0 cursor-nesw-resize border-t-[3px] border-r-[3px]",
  },
  {
    id: "sw",
    className:
      "bottom-0 left-0 cursor-nesw-resize border-b-[3px] border-l-[3px]",
  },
  {
    id: "se",
    className:
      "right-0 bottom-0 cursor-nwse-resize border-r-[3px] border-b-[3px]",
  },
]

const EDGES: { id: CropHandle; className: string }[] = [
  {
    id: "n",
    className: "top-0 left-1/2 h-[3px] w-6 -translate-x-1/2 cursor-ns-resize",
  },
  {
    id: "s",
    className:
      "bottom-0 left-1/2 h-[3px] w-6 -translate-x-1/2 cursor-ns-resize",
  },
  {
    id: "w",
    className: "top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 cursor-ew-resize",
  },
  {
    id: "e",
    className: "top-1/2 right-0 h-6 w-[3px] -translate-y-1/2 cursor-ew-resize",
  },
]

type Drag = {
  handle: CropHandle
  pointerX: number
  pointerY: number
  start: CropRect
  crop: CropRect
}

/** Photo with a draggable crop box; rotation previews live via CSS. */
export function CropStage({
  src,
  size,
  edit,
  onCropChange,
}: {
  src: string
  /** Natural size of the uploaded photo. */
  size: Size
  edit: ImageEdit
  onCropChange: (crop: CropRect, options?: { merge?: boolean }) => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<Size>({ width: 0, height: 0 })
  const [drag, setDrag] = useState<Drag | null>(null)

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () =>
      setBox({ width: el.clientWidth, height: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const frame = orientedSize(size, edit.quarter)
  const fit =
    box.width > 0 && box.height > 0
      ? Math.min(box.width / frame.width, box.height / frame.height)
      : 0
  const crop = drag?.crop ?? edit.crop
  const zoom = straightenScale(frame, edit.straighten)

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    const handle = ((e.target as HTMLElement).closest<HTMLElement>(
      "[data-handle]"
    )?.dataset.handle ?? "move") as CropHandle
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({
      handle,
      pointerX: e.clientX,
      pointerY: e.clientY,
      start: edit.crop,
      crop: edit.crop,
    })
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag || fit === 0) return
    const dx = (e.clientX - drag.pointerX) / (frame.width * fit)
    const dy = (e.clientY - drag.pointerY) / (frame.height * fit)
    setDrag({
      ...drag,
      crop: dragCrop(drag.start, drag.handle, dx, dy, edit.aspect, frame),
    })
  }

  function onPointerUp() {
    if (!drag) return
    onCropChange(drag.crop)
    setDrag(null)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = e.shiftKey ? 0.05 : 0.01
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const d = delta[e.key]
    if (!d) return
    e.preventDefault()
    onCropChange(nudgeCrop(edit.crop, d[0], d[1]), { merge: true })
  }

  return (
    <motion.div
      ref={boxRef}
      className="grid place-items-center"
      style={{
        width: "min(88vw, 560px)",
        height: "max(220px, calc(100dvh - 26rem))",
      }}
      initial={{ opacity: 0, transform: "scale(0.98)" }}
      animate={{ opacity: 1, transform: "scale(1)" }}
      exit={{ opacity: 0, transform: "scale(0.98)" }}
      transition={{ duration: 0.2, ease: EASE_OUT }}
    >
      {fit > 0 ? (
        <div
          className="relative overflow-hidden rounded-[4px] bg-black/[0.04]"
          style={{ width: frame.width * fit, height: frame.height * fit }}
        >
          <img
            src={src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute top-1/2 left-1/2 max-w-none select-none"
            style={{
              width: size.width * fit,
              height: size.height * fit,
              transform: `translate(-50%, -50%) rotate(${edit.straighten}deg) scale(${zoom}) rotate(${edit.quarter * 90}deg) scaleX(${edit.flipX ? -1 : 1})`,
            }}
          />

          <div
            role="group"
            tabIndex={0}
            aria-label="Crop area. Drag to move, drag corners to resize, or use the arrow keys."
            className="absolute cursor-move touch-none shadow-[0_0_0_9999px_rgba(17,17,17,0.55)] outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            style={{
              left: `${crop.x * 100}%`,
              top: `${crop.y * 100}%`,
              width: `${crop.w * 100}%`,
              height: `${crop.h * 100}%`,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => setDrag(null)}
            onKeyDown={onKeyDown}
          >
            <span className="pointer-events-none absolute inset-0 border border-white/90" />
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-0 transition-opacity duration-150",
                drag || edit.straighten !== 0 ? "opacity-100" : "opacity-0"
              )}
              style={{
                backgroundImage:
                  "linear-gradient(to right, transparent calc(33.33% - 0.5px), rgba(255,255,255,0.5) calc(33.33% - 0.5px), rgba(255,255,255,0.5) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgba(255,255,255,0.5) calc(66.66% - 0.5px), rgba(255,255,255,0.5) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px)), linear-gradient(to bottom, transparent calc(33.33% - 0.5px), rgba(255,255,255,0.5) calc(33.33% - 0.5px), rgba(255,255,255,0.5) calc(33.33% + 0.5px), transparent calc(33.33% + 0.5px), transparent calc(66.66% - 0.5px), rgba(255,255,255,0.5) calc(66.66% - 0.5px), rgba(255,255,255,0.5) calc(66.66% + 0.5px), transparent calc(66.66% + 0.5px))",
              }}
            />
            {CORNERS.map((c) => (
              <span
                key={c.id}
                data-handle={c.id}
                className={cn(
                  "absolute size-5 border-white drop-shadow-[0_0_1px_rgba(0,0,0,0.6)] before:absolute before:-inset-3 before:content-['']",
                  c.className
                )}
              />
            ))}
            {edit.aspect === "free"
              ? EDGES.map((e) => (
                  <span
                    key={e.id}
                    data-handle={e.id}
                    className={cn(
                      "absolute rounded-full bg-white drop-shadow-[0_0_1px_rgba(0,0,0,0.6)] before:absolute before:-inset-3 before:content-['']",
                      e.className
                    )}
                  />
                ))
              : null}
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}
