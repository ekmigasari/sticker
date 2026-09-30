import { useEffect, useRef } from "react"
import {
  createPrintScene,
  PRINT_H,
  PRINT_LOOP_S,
  PRINT_W,
} from "./print-loading-scene"

type Props = {
  imageSrc: string | null
  className?: string
  onTick?: (loopT: number, loopProgress: number) => void
}

/**
 * 1080×1350 print scene, scaled to fit. Transparent canvas, autoplay + loop.
 */
export function PrintLoadingCanvas({ imageSrc, className, onTick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onTickRef = useRef(onTick)

  useEffect(() => {
    onTickRef.current = onTick
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d", { alpha: true })
    if (!ctx) return

    canvas.width = PRINT_W
    canvas.height = PRINT_H

    const scene = createPrintScene(ctx)
    let raf = 0
    let start = performance.now()
    let cancelled = false

    void scene.setImageSrc(imageSrc).then(() => {
      if (cancelled) return
      // Restart the loop so the sticker feeds from the slot, not mid-frame.
      start = performance.now()
    })

    const frame = (now: number) => {
      if (cancelled) return
      const elapsed = (now - start) / 1000
      const t = elapsed % PRINT_LOOP_S
      scene.drawFrame(t)
      onTickRef.current?.(t, t / PRINT_LOOP_S)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [imageSrc])

  return (
    <canvas
      ref={canvasRef}
      width={PRINT_W}
      height={PRINT_H}
      className={className}
      aria-hidden
      style={{
        width: "100%",
        height: "auto",
        maxHeight: "100%",
        objectFit: "contain",
        display: "block",
        background: "transparent",
      }}
    />
  )
}

export { PRINT_LOOP_S }
