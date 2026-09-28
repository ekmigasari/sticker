import { useRef, useState } from "react"
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react"
import { cn } from "@/lib/utils"

type Props = {
  src: string
  holo: boolean
  /** Target longest-side display size in CSS pixels (1:1 with export when it fits). */
  sizePx: number
  /** Changes only when a new image is loaded, to replay the entrance. */
  appearKey: string | number
  className?: string
}

const TILT_SPRING = { stiffness: 230, damping: 15, mass: 0.7 }
const LIFT_SPRING = { stiffness: 320, damping: 28 }

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

/** Resistance that grows with distance, like pulling vinyl off its backing. */
function rubber(d: number, dim: number) {
  return Math.sign(d) * dim * (1 - 1 / ((Math.abs(d) / dim) * 0.55 + 1))
}

export function FloatingSticker({
  src,
  holo,
  sizePx,
  appearKey,
  className,
}: Props) {
  const hitRef = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const canHover = useRef(false)
  const [aspect, setAspect] = useState(1)
  const drag = useRef<{
    id: number
    gx: number
    gy: number
    x: number
    y: number
  } | null>(null)

  const rxT = useMotionValue(0)
  const ryT = useMotionValue(0)
  const txT = useMotionValue(0)
  const tyT = useMotionValue(0)
  const liftT = useMotionValue(0)
  const glossXT = useMotionValue(30)
  const glossYT = useMotionValue(20)
  const glossOT = useMotionValue(0)

  const rx = useSpring(rxT, TILT_SPRING)
  const ry = useSpring(ryT, TILT_SPRING)
  const tx = useSpring(txT, TILT_SPRING)
  const ty = useSpring(tyT, TILT_SPRING)
  const lift = useSpring(liftT, LIFT_SPRING)
  const glossX = useSpring(glossXT, LIFT_SPRING)
  const glossY = useSpring(glossYT, LIFT_SPRING)
  const glossOpacity = useSpring(glossOT, LIFT_SPRING)

  const scale = useTransform(lift, [0, 1], [1, 1.05])
  const transform = useMotionTemplate`perspective(1100px) translate3d(${tx}px, ${ty}px, 0) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`

  const shadowX = useTransform(() => tx.get() * 0.55 - ry.get() * 0.5)
  const shadowY = useTransform(
    () => 20 + lift.get() * 26 + ty.get() * 0.35 + rx.get() * 0.45
  )
  const shadowScale = useTransform(lift, [0, 1], [0.95, 1.03])
  const shadowTransform = useMotionTemplate`translate3d(${shadowX}px, ${shadowY}px, 0) scale(${shadowScale})`
  const shadowOpacity = useTransform(lift, [0, 1], [0.2, 0.13])

  // Backing liner stays put; opacity rises as the vinyl peels away.
  const backingOpacity = useTransform(lift, [0, 0.15, 1], [0.12, 0.55, 1])
  const backingScale = useTransform(lift, [0, 1], [0.985, 1])
  const backingTransform = useMotionTemplate`scale(${backingScale})`

  const gloss = useMotionTemplate`radial-gradient(circle at ${glossX}% ${glossY}%, rgba(255,255,255,0.7), rgba(255,255,255,0) 55%)`
  const holoX = useTransform(ry, (v) => 50 + v * 2.4)
  const holoY = useTransform(rx, (v) => 50 - v * 2.4)
  const holoPosition = useMotionTemplate`${holoX}% ${holoY}%`

  function normalized(e: React.PointerEvent) {
    const el = hitRef.current
    if (!el) return { nx: 0, ny: 0 }
    const r = el.getBoundingClientRect()
    return {
      nx: clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1),
      ny: clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1),
    }
  }

  function rest(hovering: boolean) {
    rxT.set(0)
    ryT.set(0)
    txT.set(0)
    tyT.set(0)
    liftT.set(hovering ? 0.3 : 0)
    glossOT.set(hovering ? 0.35 : 0)
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current
    if (d) {
      if (e.pointerId !== d.id) return
      const dx = e.clientX - d.x
      const dy = e.clientY - d.y
      // Grabbing near the border lifts more, as if peeling from the edge.
      const edge = clamp(Math.max(Math.abs(d.gx), Math.abs(d.gy)), 0.3, 1)
      const lifted = 16 * edge
      const pullX = rubber(dx, 160) / 160
      const pullY = rubber(dy, 160) / 160
      txT.set(rubber(dx, 70))
      tyT.set(rubber(dy, 70))
      ryT.set(clamp(-(d.gx * lifted + pullX * 26), -40, 40))
      rxT.set(clamp(d.gy * lifted + pullY * 26, -40, 40))
      return
    }
    // Touch has no hover; tilting on tap would be a false hover state.
    canHover.current = e.pointerType === "mouse"
    if (!canHover.current) return
    const { nx, ny } = normalized(e)
    ryT.set(nx * 10)
    rxT.set(-ny * 10)
    liftT.set(0.3)
    glossXT.set(50 + nx * 45)
    glossYT.set(50 + ny * 45)
    glossOT.set(0.45)
  }

  function onPointerDown(e: React.PointerEvent) {
    if (drag.current) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const { nx, ny } = normalized(e)
    drag.current = { id: e.pointerId, gx: nx, gy: ny, x: e.clientX, y: e.clientY }
    liftT.set(1)
    glossXT.set(50 + nx * 50)
    glossYT.set(50 + ny * 50)
    glossOT.set(0.8)
    ryT.set(-nx * 12)
    rxT.set(ny * 12)
  }

  function endDrag(e: React.PointerEvent) {
    const d = drag.current
    if (!d || e.pointerId !== d.id) return
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
    rest(e.pointerType === "mouse" && e.type !== "pointercancel")
  }

  const mask = {
    WebkitMaskImage: `url(${src})`,
    maskImage: `url(${src})`,
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
  } as const

  // 1 CSS px ≈ 1 image px when it fits; otherwise shrink to the viewport.
  const displayWidth = `min(${sizePx}px, 82vw, calc((100dvh - 22rem) * ${aspect}))`

  return (
    <motion.div
      key={appearKey}
      className={cn("sticker-float relative", className)}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotate: -4 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ type: "spring", duration: 0.55, bounce: 0.3 }}
    >
      <div
        ref={hitRef}
        className="relative touch-none select-none"
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          if (!drag.current) rest(false)
        }}
        style={{ cursor: "grab" }}
      >
        {/* Release liner — same silhouette as the sticker, stays while vinyl peels. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{
            opacity: backingOpacity,
            transform: backingTransform,
            ...mask,
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: "#f4f2ea",
              backgroundImage:
                "repeating-linear-gradient(135deg, rgba(0,0,0,0.045) 0 2px, transparent 2px 7px)",
            }}
          />
          <div
            className="absolute inset-[-30%] flex flex-wrap content-center justify-center gap-x-4 gap-y-5"
            style={{
              transform: "rotate(-28deg)",
              opacity: 0.28,
            }}
          >
            {Array.from({ length: 56 }, (_, i) => (
              <span
                key={i}
                className="shrink-0 text-[10px] font-semibold tracking-[0.18em] text-neutral-500 uppercase"
              >
                netkraf
              </span>
            ))}
          </div>
        </motion.div>

        <motion.img
          src={src}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-0 size-full"
          style={{
            transform: shadowTransform,
            opacity: shadowOpacity,
            filter: "brightness(0) blur(16px)",
          }}
        />
        <motion.div
          className="relative will-change-transform"
          style={{ transform, transformStyle: "preserve-3d" }}
        >
          <img
            src={src}
            alt="Sticker preview"
            draggable={false}
            onLoad={(e) => {
              const { naturalWidth: w, naturalHeight: h } = e.currentTarget
              if (w && h) setAspect(w / h)
            }}
            className="pointer-events-none block h-auto drop-shadow-[0_1px_1px_rgba(0,0,0,0.08)]"
            style={{ width: displayWidth }}
          />
          {holo ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-60 mix-blend-color-dodge"
              style={{
                ...mask,
                backgroundImage:
                  "linear-gradient(115deg, transparent 22%, rgba(255,110,220,0.6) 36%, rgba(110,220,255,0.6) 47%, rgba(255,245,140,0.55) 58%, transparent 74%)",
                backgroundSize: "300% 300%",
                backgroundPosition: holoPosition,
              }}
            />
          ) : null}
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 mix-blend-overlay"
            style={{ ...mask, backgroundImage: gloss, opacity: glossOpacity }}
          />
        </motion.div>
      </div>
    </motion.div>
  )
}
