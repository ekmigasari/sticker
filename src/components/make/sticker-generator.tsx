import { useEffect, useId, useRef, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  CaretLeft,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Plus,
  PushPin,
  Sparkle,
  WarningCircle,
} from "@phosphor-icons/react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import type { StickerFilter, StickerStyle } from "@/domain/types"
import { mmToPx, STICKER_STYLES } from "@/domain/types"
import { cn } from "@/lib/utils"
import {
  downloadDataUrl,
  getSourceMaxSide,
  PLACE_MAX_SIDE,
  PREVIEW_MAX_SIDE,
  probeImageSize,
  renderSticker,
  SIZE_DEFAULT_MM,
  SIZE_MAX_MM,
  SIZE_MIN_MM,
} from "@/lib/sticker-process"
import { useWallStore } from "@/store/wall-store"
import { firePeelConfetti } from "./confetti"
import { EditorToolbar, type EditorTab } from "./editor-toolbar"
import { FloatingSticker } from "./floating-sticker"
import { PrintLoadingCanvas, PRINT_LOOP_S } from "./print-loading-canvas"

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024
const ZOOM_MIN = 0.35
const ZOOM_MAX = 2.5
const ZOOM_STEP = 0.15
const EASE_OUT = [0.23, 1, 0.32, 1] as const

/** Screen pixels per millimetre for the editor preview (not print DPI). */
const PREVIEW_PX_PER_MM = 2.2

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [header, data] = dataUrl.split(",")
  const mime = /data:(.*?);/.exec(header)?.[1] || "image/png"
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], fileName, { type: mime })
}

export function StickerGenerator({ stickerId }: { stickerId?: string }) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const setDraftSticker = useWallStore((s) => s.setDraftSticker)
  const setPlaceDraft = useWallStore((s) => s.setPlaceDraft)

  const [source, setSource] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState(0)
  const [sourceMaxSide, setSourceMaxSide] = useState<number | null>(null)
  const [style, setStyle] = useState<StickerStyle>("classic")
  const [filter, setFilter] = useState<StickerFilter>("original")
  const [outlineColor, setOutlineColor] = useState("#FFFFFF")
  const [thickness, setThickness] = useState(16)
  const [sizeMm, setSizeMm] = useState(SIZE_DEFAULT_MM)
  const [zoom, setZoom] = useState(1)
  const [tab, setTab] = useState<EditorTab>("style")
  const [actionsOpen, setActionsOpen] = useState(false)
  const [confirmNewOpen, setConfirmNewOpen] = useState(false)
  const [confirmPlaceOpen, setConfirmPlaceOpen] = useState(false)
  const [peelDone, setPeelDone] = useState(false)
  const [peelSession, setPeelSession] = useState(0)

  const [preview, setPreview] = useState<string | null>(null)
  const [styleThumbs, setStyleThumbs] = useState<
    Partial<Record<StickerStyle, string>>
  >({})
  const [filterThumb, setFilterThumb] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const uploadingRef = useRef(false)
  const uploadStartedAt = useRef(0)
  const finishTimer = useRef<number | null>(null)
  const replacingArtwork = Boolean(stickerId)

  useEffect(() => {
    uploadingRef.current = uploading
  })

  // Full-screen confetti when the peel celebration opens.
  useEffect(() => {
    if (!peelDone) return
    firePeelConfetti()
  }, [peelDone])

  // Progress follows the 8s print loop clock.
  useEffect(() => {
    if (!uploading) return
    const tick = window.setInterval(() => {
      const elapsed = (performance.now() - uploadStartedAt.current) / 1000
      setUploadProgress(Math.min(99, (elapsed / PRINT_LOOP_S) * 100))
    }, 80)
    return () => window.clearInterval(tick)
  }, [uploading])

  // Preview canvas stays at a fixed resolution — size only affects display/export.
  useEffect(() => {
    if (!source) return
    let cancelled = false
    const t = window.setTimeout(() => {
      renderSticker(source, {
        style,
        filter,
        outlineColor,
        outlineThickness: thickness,
        maxSide: PREVIEW_MAX_SIDE,
      })
        .then((url) => {
          if (cancelled) return
          setPreview(url)
          setError(null)
          if (uploadingRef.current) {
            // Hold until one full print cycle (~8s) so the scene can finish.
            const elapsed = performance.now() - uploadStartedAt.current
            const remain = Math.max(0, PRINT_LOOP_S * 1000 - elapsed)
            if (finishTimer.current) window.clearTimeout(finishTimer.current)
            finishTimer.current = window.setTimeout(() => {
              if (cancelled) return
              setUploadProgress(100)
              setUploading(false)
            }, remain)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setUploading(false)
            setUploadProgress(0)
            setError("That image couldn't be processed.")
          }
        })
    }, 40)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [source, style, filter, outlineColor, thickness])

  useEffect(() => {
    if (!source) return
    let cancelled = false
    const t = window.setTimeout(() => {
      void Promise.all(
        STICKER_STYLES.map((s) =>
          renderSticker(source, {
            style: s,
            filter,
            outlineColor,
            outlineThickness: thickness,
            maxSide: 128,
          }).then((url) => [s, url] as const)
        )
      ).then((entries) => {
        if (!cancelled) setStyleThumbs(Object.fromEntries(entries))
      })
      void renderSticker(source, {
        style,
        filter: "original",
        outlineColor,
        outlineThickness: thickness,
        maxSide: 128,
      }).then((url) => {
        if (!cancelled) setFilterThumb(url)
      })
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [source, style, filter, outlineColor, thickness])

  function onFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Choose a PNG, JPG, or WebP image.")
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Images need to be under 12 MB.")
      return
    }
    setUploading(true)
    setUploadProgress(0)
    uploadStartedAt.current = performance.now()
    if (finishTimer.current) {
      window.clearTimeout(finishTimer.current)
      finishTimer.current = null
    }
    setError(null)
    setPreview(null)
    setStyleThumbs({})
    setFilterThumb(null)
    setZoom(1)
    setPeelDone(false)
    const reader = new FileReader()
    reader.onprogress = (e) => {
      if (!e.lengthComputable) return
      // File read covers the first half of the progress meter.
      setUploadProgress(Math.round((e.loaded / e.total) * 50))
    }
    reader.onload = () => {
      const dataUrl = String(reader.result)
      setUploadProgress((p) => Math.max(p, 52))
      setSource(dataUrl)
      setSourceId((n) => n + 1)
      void getSourceMaxSide(dataUrl).then((max) => {
        setSourceMaxSide(max)
        // Default print size matches the source at 300 DPI, capped to the slider range.
        const naturalMm = (max * 25.4) / 300
        setSizeMm(
          Math.min(SIZE_MAX_MM, Math.max(SIZE_MIN_MM, Math.round(naturalMm)))
        )
      })
    }
    reader.onerror = () => {
      setUploading(false)
      setUploadProgress(0)
      setError("That image couldn't be read.")
    }
    reader.readAsDataURL(file)
  }

  function resetToNew() {
    setSource(null)
    setSourceId((n) => n + 1)
    setSourceMaxSide(null)
    setStyle("classic")
    setFilter("original")
    setOutlineColor("#FFFFFF")
    setThickness(16)
    setSizeMm(SIZE_DEFAULT_MM)
    setZoom(1)
    setTab("style")
    setPreview(null)
    setStyleThumbs({})
    setFilterThumb(null)
    setError(null)
    setActionsOpen(false)
    setConfirmNewOpen(false)
    setPeelDone(false)
    setUploading(false)
    setUploadProgress(0)
    if (finishTimer.current) {
      window.clearTimeout(finishTimer.current)
      finishTimer.current = null
    }
  }

  function requestNewSticker() {
    if (!source) {
      inputRef.current?.click()
      return
    }
    setActionsOpen(false)
    setConfirmNewOpen(true)
  }

  async function handleDownload() {
    if (!source) return
    setExporting(true)
    setActionsOpen(false)
    try {
      const url = await renderSticker(source, {
        style,
        filter,
        outlineColor,
        outlineThickness: thickness,
        maxSide: Math.round(mmToPx(sizeMm)),
      })
      downloadDataUrl(url, `sticker-${style}.png`)
    } finally {
      setExporting(false)
    }
  }

  async function handlePlace() {
    if (!source) return
    setConfirmPlaceOpen(false)
    setExporting(true)
    setActionsOpen(false)
    try {
      const url = await renderSticker(source, {
        style,
        filter,
        outlineColor,
        outlineThickness: thickness,
        // Wall stickers are zoomable, so always export at the storage cap
        // rather than the print size (small prints were only ~100px wide).
        maxSide: PLACE_MAX_SIDE,
        format: "webp",
      })
      const { width, height } = await probeImageSize(url)
      setDraftSticker({
        imageDataUrl: url,
        style,
        filter,
        outlineColor,
        outlineThickness: thickness,
        widthPx: width,
        heightPx: height,
        sizeMm,
      })
      setPlaceDraft(null)
      void navigate({ to: "/place" })
    } catch {
      setError("Couldn't prepare your sticker for the wall. Try again.")
    } finally {
      setExporting(false)
    }
  }

  function requestPlace() {
    if (!source || replacingArtwork) return
    setConfirmPlaceOpen(true)
  }

  function cancelPlace() {
    setConfirmPlaceOpen(false)
    // Remount so a finished peel can be tried again.
    setPeelSession((n) => n + 1)
  }

  function dismissPeelDone() {
    setActionsOpen(false)
    setPeelDone(false)
    // Put the sticker back so the peel can be replayed.
    setPeelSession((n) => n + 1)
  }

  function placeFromPeel() {
    setActionsOpen(false)
    setPeelDone(false)
    void handlePlace()
  }

  async function handleSaveToSticker() {
    if (!source || !stickerId) return
    setExporting(true)
    setError(null)
    try {
      const url = await renderSticker(source, {
        style,
        filter,
        outlineColor,
        outlineThickness: thickness,
        maxSide: 1200,
      })
      const file = dataUrlToFile(url, `sticker-${style}.png`)
      const form = new FormData()
      form.set("file", file)
      form.set("style", style)
      form.set("filter", filter)
      form.set("outlineColor", outlineColor)
      form.set("outlineThickness", String(thickness))

      const response = await fetch(`/api/stickers/${stickerId}`, {
        method: "PATCH",
        body: form,
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        if (response.status === 401) {
          setError("Sign in to save stickers.")
          void navigate({ to: "/sign-in" })
          return
        }
        setError(payload?.error ?? "Could not save sticker.")
        return
      }

      void navigate({
        to: "/dashboard/stickers/$id",
        params: { id: stickerId },
      })
    } finally {
      setExporting(false)
    }
  }

  const ready = Boolean(source && preview)
  const displayPx = Math.max(48, sizeMm * PREVIEW_PX_PER_MM * zoom)
  const sizePx = Math.round(mmToPx(sizeMm))
  const upscaling = sourceMaxSide != null && sizePx > sourceMaxSide + 0.5

  return (
    <div
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-white font-ui text-neutral-900 antialiased"
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragOver(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        onFile(e.dataTransfer.files?.[0])
      }}
    >
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between px-3 pt-[env(safe-area-inset-top)] sm:px-5">
        {replacingArtwork && stickerId ? (
          <Link
            to="/dashboard/stickers/$id"
            params={{ id: stickerId }}
            aria-label="Back to sticker"
            className="press grid size-10 place-items-center rounded-full bg-black/[0.045] text-neutral-900 transition-colors hover:bg-black/[0.07] active:scale-[0.97]"
          >
            <CaretLeft weight="bold" className="size-[18px]" />
          </Link>
        ) : (
          <Link
            to="/"
            aria-label="Back to wall"
            className="press grid size-10 place-items-center rounded-full bg-black/[0.045] text-neutral-900 transition-colors hover:bg-black/[0.07] active:scale-[0.97]"
          >
            <CaretLeft weight="bold" className="size-[18px]" />
          </Link>
        )}

        <h1
          className={cn(
            "pointer-events-none absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold tracking-[-0.01em]",
            source && "hidden sm:block"
          )}
        >
          {replacingArtwork ? "Replace artwork" : "New Sticker"}
        </h1>

        <div className="flex items-center gap-2">
          {source && !replacingArtwork ? (
            <>
              <button
                type="button"
                onClick={requestNewSticker}
                className="press h-10 rounded-full bg-black/[0.045] px-4 text-[14px] font-semibold tracking-[-0.01em] text-neutral-900 transition-colors hover:bg-black/[0.07] active:scale-[0.97]"
              >
                New
              </button>
              <button
                type="button"
                disabled={!ready || exporting}
                onClick={() => void handlePlace()}
                className="press h-10 rounded-full bg-neutral-900 px-4 text-[14px] font-semibold tracking-[-0.01em] text-white transition-opacity active:scale-[0.97] disabled:opacity-35"
              >
                {exporting ? "…" : "Place"}
              </button>
            </>
          ) : null}

          {replacingArtwork ? (
            <button
              type="button"
              disabled={!ready || exporting}
              onClick={() => void handleSaveToSticker()}
              className="press h-10 rounded-full bg-neutral-900 px-4 text-[14px] font-semibold tracking-[-0.01em] text-white transition-opacity active:scale-[0.97] disabled:opacity-35"
            >
              {exporting ? "Saving…" : "Save"}
            </button>
          ) : null}
        </div>
      </header>

      <main className="relative min-h-0 flex-1 overflow-auto overscroll-contain pb-[220px]">
        <div className="flex min-h-full min-w-full items-center justify-center p-8">
          <AnimatePresence mode="wait">
            {source ? (
              preview && !uploading ? (
                <FloatingSticker
                  key={`${sourceId}-${peelSession}`}
                  src={preview}
                  holo={filter === "glitter" || filter === "hologram"}
                  displayPx={displayPx}
                  appearKey={`${sourceId}-${peelSession}`}
                  onFullyPeeled={() => {
                    if (replacingArtwork) return
                    setActionsOpen(false)
                    setPeelDone(true)
                  }}
                />
              ) : (
                <UploadLoading
                  key="processing"
                  progress={uploadProgress}
                  previewHint={source}
                />
              )
            ) : uploading ? (
              <UploadLoading key="uploading" progress={uploadProgress} />
            ) : (
              <EmptyState key="empty" inputId={inputId} />
            )}
          </AnimatePresence>
        </div>

        {error ? (
          <p
            role="alert"
            className="pointer-events-none fixed bottom-[140px] left-1/2 z-30 w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white"
          >
            {error}
          </p>
        ) : null}
      </main>

      {source ? (
        <div className="pointer-events-none absolute top-[calc(3.5rem+env(safe-area-inset-top)+8px)] right-3 z-20 flex flex-col items-end gap-1.5 sm:right-5">
          <ZoomButton
            label="Zoom in"
            disabled={zoom >= ZOOM_MAX}
            onClick={() =>
              setZoom((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(2)))
            }
          >
            <MagnifyingGlassPlus weight="bold" className="size-[16px]" />
          </ZoomButton>
          <ZoomButton
            label="Zoom out"
            disabled={zoom <= ZOOM_MIN}
            onClick={() =>
              setZoom((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(2)))
            }
          >
            <MagnifyingGlassMinus weight="bold" className="size-[16px]" />
          </ZoomButton>
          <span className="pointer-events-none mt-0.5 text-center text-[10px] font-semibold text-neutral-400 tabular-nums">
            {Math.round(zoom * 100)}%
          </span>

          <AnimatePresence>
            {upscaling ? (
              <motion.div
                role="status"
                className="mt-2 flex max-w-[200px] items-start gap-1.5 rounded-full border border-amber-200/80 bg-amber-50/95 px-3 py-1.5 text-[11px] leading-snug font-medium text-amber-800 shadow-[0_6px_20px_-8px_rgba(180,120,0,0.35)] backdrop-blur-md"
                initial={{
                  opacity: 0,
                  transform: "translateY(-4px) scale(0.96)",
                }}
                animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
                exit={{ opacity: 0, transform: "translateY(-4px) scale(0.96)" }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                <WarningCircle
                  weight="fill"
                  className="mt-px size-3.5 shrink-0 text-amber-600"
                />
                <span>
                  Upscaling past {sourceMaxSide} px — edges may look soft.
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
        <EditorToolbar
          tab={tab}
          onTabChange={setTab}
          disabled={!ready}
          style={style}
          onStyleChange={setStyle}
          styleThumbs={styleThumbs}
          filter={filter}
          onFilterChange={setFilter}
          filterThumb={filterThumb}
          outlineColor={outlineColor}
          onOutlineColorChange={setOutlineColor}
          thickness={thickness}
          onThicknessChange={setThickness}
          sizeMm={sizeMm}
          onSizeMmChange={setSizeMm}
          sourceMaxSide={sourceMaxSide}
          actionsOpen={actionsOpen}
          onActionsOpenChange={setActionsOpen}
          onDownload={() => void handleDownload()}
          onPlace={requestPlace}
          onNewSticker={requestNewSticker}
          placeLabel="Put on wall"
          exporting={exporting}
        />
      </div>

      <AnimatePresence>
        {peelDone ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12, ease: EASE_OUT }}
          >
            <button
              type="button"
              aria-label="Dismiss"
              className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
              onClick={dismissPeelDone}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="peel-done-title"
              aria-describedby="peel-done-desc"
              className="relative w-full max-w-[340px] rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]"
              initial={{ opacity: 0, transform: "scale(0.96) translateY(6px)" }}
              animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
              exit={{ opacity: 0, transform: "scale(0.97) translateY(4px)" }}
              transition={{ duration: 0.14, ease: EASE_OUT }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt=""
                  className="mx-auto mb-4 max-h-[112px] max-w-[168px] drop-shadow-[0_10px_20px_-12px_rgba(0,0,0,0.3)]"
                />
              ) : null}
              <h2
                id="peel-done-title"
                className="text-center text-[17px] font-semibold tracking-[-0.02em] text-neutral-900"
              >
                Ready to place
              </h2>
              <p
                id="peel-done-desc"
                className="mx-auto mt-2 max-w-[280px] text-center text-[14px] leading-snug text-neutral-500"
              >
                Your sticker is peeled. Put it on the wall when you’re ready.
              </p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={dismissPeelDone}
                  className="press h-10 rounded-full bg-black/[0.05] px-4 text-[14px] font-semibold tracking-[-0.01em] text-neutral-800 transition-colors hover:bg-black/[0.08] active:scale-[0.97]"
                >
                  Not now
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={placeFromPeel}
                  className="press h-10 rounded-full bg-neutral-900 px-4 text-[14px] font-semibold tracking-[-0.01em] text-white active:scale-[0.97] disabled:opacity-50"
                >
                  {exporting ? "…" : "Put on wall"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {confirmNewOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
          >
            <button
              type="button"
              aria-label="Dismiss"
              className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
              onClick={() => setConfirmNewOpen(false)}
            />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="new-sticker-title"
              aria-describedby="new-sticker-desc"
              className="relative w-full max-w-[340px] rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]"
              initial={{ opacity: 0, transform: "scale(0.96) translateY(6px)" }}
              animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
              exit={{ opacity: 0, transform: "scale(0.96) translateY(6px)" }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
            >
              <h2
                id="new-sticker-title"
                className="text-[17px] font-semibold tracking-[-0.02em] text-neutral-900"
              >
                Start a new sticker?
              </h2>
              <p
                id="new-sticker-desc"
                className="mt-2 text-[14px] leading-snug text-neutral-500"
              >
                You’ll leave this unsaved sticker. Download or place it first if
                you want to keep it.
              </p>
              <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmNewOpen(false)}
                  className="press h-10 rounded-full bg-black/[0.05] px-4 text-[14px] font-semibold tracking-[-0.01em] text-neutral-800 transition-colors hover:bg-black/[0.08] active:scale-[0.97]"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={resetToNew}
                  className="press h-10 rounded-full bg-neutral-900 px-4 text-[14px] font-semibold tracking-[-0.01em] text-white active:scale-[0.97]"
                >
                  New sticker
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {confirmPlaceOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
          >
            <button
              type="button"
              aria-label="Dismiss"
              className="absolute inset-0 bg-black/30 backdrop-blur-md"
              onClick={cancelPlace}
            />
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="place-sticker-title"
              aria-describedby="place-sticker-desc"
              className="relative w-full max-w-[320px] overflow-hidden rounded-[28px] border border-white/60 bg-white/90 shadow-[0_28px_80px_-24px_rgba(0,0,0,0.45)] backdrop-blur-xl"
              initial={{
                opacity: 0,
                transform: "scale(0.92) translateY(12px)",
              }}
              animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
              exit={{ opacity: 0, transform: "scale(0.96) translateY(8px)" }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 28,
                mass: 0.7,
              }}
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(120%_80%_at_50%_0%,rgba(255,214,102,0.35),rgba(255,255,255,0)_70%)]"
              />

              <div className="relative px-6 pt-8 pb-2 text-center">
                <div className="relative mx-auto mb-5 grid size-[72px] place-items-center">
                  <motion.div
                    className="absolute inset-0 rounded-full bg-amber-100/80"
                    initial={{ transform: "scale(0.7)", opacity: 0 }}
                    animate={{ transform: "scale(1)", opacity: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 22 }}
                  />
                  <motion.div
                    className="relative grid size-[56px] place-items-center rounded-full bg-gradient-to-b from-amber-300 to-orange-400 text-white shadow-[0_10px_24px_-8px_rgba(234,88,12,0.55)]"
                    initial={{
                      transform: "scale(0.6) rotate(-12deg)",
                      opacity: 0,
                    }}
                    animate={{ transform: "scale(1) rotate(0deg)", opacity: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 400,
                      damping: 18,
                      delay: 0.04,
                    }}
                  >
                    <PushPin weight="fill" className="size-7" />
                  </motion.div>

                  <motion.span
                    aria-hidden
                    className="absolute top-0 right-1 text-amber-400"
                    initial={{
                      opacity: 0,
                      transform: "scale(0.4) translateY(6px)",
                    }}
                    animate={{
                      opacity: 1,
                      transform: "scale(1) translateY(0px)",
                    }}
                    transition={{ delay: 0.12, duration: 0.28, ease: EASE_OUT }}
                  >
                    <Sparkle weight="fill" className="size-4" />
                  </motion.span>
                  <motion.span
                    aria-hidden
                    className="absolute bottom-1 left-0 text-orange-300"
                    initial={{ opacity: 0, transform: "scale(0.4)" }}
                    animate={{ opacity: 1, transform: "scale(1)" }}
                    transition={{ delay: 0.18, duration: 0.28, ease: EASE_OUT }}
                  >
                    <Sparkle weight="fill" className="size-3" />
                  </motion.span>
                  <motion.span
                    aria-hidden
                    className="absolute top-2 left-1 text-[15px] leading-none"
                    initial={{
                      opacity: 0,
                      transform: "scale(0.5) rotate(-20deg)",
                    }}
                    animate={{ opacity: 1, transform: "scale(1) rotate(0deg)" }}
                    transition={{ delay: 0.16, duration: 0.3, ease: EASE_OUT }}
                  >
                    ✨
                  </motion.span>
                </div>

                <h2
                  id="place-sticker-title"
                  className="text-[20px] font-semibold tracking-[-0.03em] text-neutral-900"
                >
                  Ready for the wall?
                </h2>
                <p
                  id="place-sticker-desc"
                  className="mx-auto mt-2 max-w-[240px] text-[14px] leading-relaxed text-neutral-500"
                >
                  Peel’s done — let’s stick it somewhere great.
                </p>
              </div>

              <div className="relative mt-5 grid grid-cols-2 gap-px border-t border-black/[0.06] bg-black/[0.06]">
                <button
                  type="button"
                  onClick={cancelPlace}
                  className="press bg-white/95 px-4 py-3.5 text-[16px] font-medium tracking-[-0.01em] text-neutral-600 transition-colors hover:bg-neutral-50 active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => void handlePlace()}
                  className="press bg-white/95 px-4 py-3.5 text-[16px] font-semibold tracking-[-0.01em] text-orange-600 transition-colors hover:bg-orange-50/80 active:scale-[0.98] disabled:opacity-50"
                >
                  {exporting ? "Placing…" : "Continue"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          onFile(e.target.files?.[0])
          e.target.value = ""
        }}
      />

      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-3 z-30 rounded-[32px] border-2 border-dashed border-neutral-900/25 bg-white/60 opacity-0 backdrop-blur-sm transition-opacity duration-150",
          dragOver && "opacity-100"
        )}
      />
    </div>
  )
}

function ZoomButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="press pointer-events-auto grid size-9 place-items-center rounded-full border border-black/[0.06] bg-white/80 text-neutral-900 shadow-[0_4px_16px_-6px_rgba(0,0,0,0.2)] backdrop-blur-xl transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white active:scale-[0.97] disabled:opacity-35"
    >
      {children}
    </button>
  )
}

function EmptyState({ inputId }: { inputId: string }) {
  return (
    <motion.label
      htmlFor={inputId}
      className="press group flex cursor-pointer flex-col items-center text-center"
      initial={{ opacity: 0, transform: "translateY(8px) scale(0.98)" }}
      animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
      exit={{
        opacity: 0,
        transform: "translateY(-8px) scale(0.96)",
        filter: "blur(2px)",
      }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
    >
      <span className="sticker-float relative mb-7 grid size-36 -rotate-6 place-items-center rounded-[34px] bg-white shadow-[0_24px_40px_-18px_rgba(0,0,0,0.28),0_0_0_1px_rgba(0,0,0,0.05)] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-rotate-3 group-active:scale-[0.97]">
        <span className="grid size-14 place-items-center rounded-full bg-neutral-900 text-white">
          <Plus weight="bold" className="size-6" />
        </span>
      </span>
      <span className="text-[22px] font-semibold tracking-[-0.02em]">
        Add an image
      </span>
      <span className="mt-1.5 max-w-[260px] text-[15px] leading-snug text-neutral-500">
        Logo, product, or artwork. Pick a style, filter, and print size.
      </span>
      <span className="mt-6 inline-flex h-11 items-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-active:scale-[0.97]">
        Choose Photo
      </span>
    </motion.label>
  )
}

function UploadLoading({
  progress,
  previewHint,
}: {
  progress: number
  previewHint?: string | null
}) {
  const reduce = useReducedMotion()
  const pct = Math.max(0, Math.min(100, Math.round(progress)))

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={`Printing sticker ${pct} percent`}
      className="flex w-full max-w-[min(420px,86vw)] flex-col items-center text-center"
      initial={{ opacity: 0, transform: "scale(0.97) translateY(6px)" }}
      animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
      exit={{
        opacity: 0,
        transform: "scale(0.98) translateY(-4px)",
        filter: "blur(2px)",
      }}
      transition={{ duration: 0.28, ease: EASE_OUT }}
    >
      <div className="relative w-full overflow-hidden rounded-[24px]">
        {reduce ? (
          <div className="flex aspect-[1080/1350] w-full flex-col items-center justify-center px-8">
            {previewHint ? (
              <img
                src={previewHint}
                alt=""
                className="max-h-[46%] max-w-[70%] object-contain drop-shadow-[0_12px_28px_-14px_rgba(0,0,0,0.35)]"
              />
            ) : null}
            <p className="mt-6 text-[15px] font-medium text-neutral-600">
              Printing sticker…
            </p>
          </div>
        ) : (
          <PrintLoadingCanvas
            imageSrc={previewHint ?? null}
            className="aspect-[1080/1350] w-full bg-transparent"
          />
        )}
      </div>

      <p className="mt-5 text-[28px] font-semibold tracking-[-0.04em] text-neutral-900 tabular-nums">
        {pct}
        <span className="ml-0.5 text-[18px] font-semibold text-neutral-400">
          %
        </span>
      </p>
      <p className="mt-1 text-[14px] font-medium tracking-[-0.01em] text-neutral-500">
        {pct >= 100 ? "Done" : "Printing your sticker…"}
      </p>
    </motion.div>
  )
}
