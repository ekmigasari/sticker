import { useEffect, useId, useRef, useState } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  CaretLeft,
  DownloadSimple,
  ImageSquare,
  Plus,
} from "@phosphor-icons/react"
import { motion } from "motion/react"
import type { StickerFilter, StickerStyle } from "@/domain/types"
import { STICKER_STYLES } from "@/domain/types"
import { cn } from "@/lib/utils"
import { downloadDataUrl, renderSticker } from "@/lib/sticker-process"
import { useWallStore } from "@/store/wall-store"
import { EditorToolbar, type EditorTab } from "./editor-toolbar"
import { FloatingSticker } from "./floating-sticker"

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

export function StickerGenerator() {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const setDraftSticker = useWallStore((s) => s.setDraftSticker)
  const setPlaceDraft = useWallStore((s) => s.setPlaceDraft)

  const [source, setSource] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState(0)
  const [style, setStyle] = useState<StickerStyle>("classic")
  const [filter, setFilter] = useState<StickerFilter>("original")
  const [outlineColor, setOutlineColor] = useState("#FFFFFF")
  const [thickness, setThickness] = useState(16)
  const [tab, setTab] = useState<EditorTab>("style")

  const [preview, setPreview] = useState<string | null>(null)
  const [styleThumbs, setStyleThumbs] = useState<
    Partial<Record<StickerStyle, string>>
  >({})
  const [filterThumb, setFilterThumb] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    if (!source) return
    let cancelled = false
    const t = window.setTimeout(() => {
      renderSticker(source, { style, filter, outlineColor, outlineThickness: thickness })
        .then((url) => {
          if (cancelled) return
          setPreview(url)
          setError(null)
        })
        .catch(() => {
          if (!cancelled) setError("That image couldn't be processed.")
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
    const reader = new FileReader()
    reader.onload = () => {
      setError(null)
      setPreview(null)
      setStyleThumbs({})
      setFilterThumb(null)
      setSource(String(reader.result))
      setSourceId((n) => n + 1)
    }
    reader.readAsDataURL(file)
  }

  async function handleDownload() {
    if (!source) return
    setExporting(true)
    try {
      const url = await renderSticker(source, {
        style,
        filter,
        outlineColor,
        outlineThickness: thickness,
        maxSide: 1200,
      })
      downloadDataUrl(url, `sticker-${style}.png`)
    } finally {
      setExporting(false)
    }
  }

  async function handlePlace() {
    if (!source) return
    setExporting(true)
    try {
      const url = await renderSticker(source, {
        style,
        filter,
        outlineColor,
        outlineThickness: thickness,
        maxSide: 480,
      })
      setDraftSticker({
        imageDataUrl: url,
        style,
        filter,
        outlineColor,
        outlineThickness: thickness,
      })
      setPlaceDraft(null)
      void navigate({ to: "/place" })
    } finally {
      setExporting(false)
    }
  }

  const ready = Boolean(source && preview)

  return (
    <div
      className="font-ui relative flex h-[100dvh] flex-col overflow-hidden bg-white text-neutral-900 antialiased"
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
        <Link
          to="/"
          aria-label="Back to wall"
          className="press grid size-10 place-items-center rounded-full bg-black/[0.045] text-neutral-900 transition-colors hover:bg-black/[0.07]"
        >
          <CaretLeft weight="bold" className="size-[18px]" />
        </Link>

        <h1 className="absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold tracking-[-0.01em]">
          New Sticker
        </h1>

        <div className="flex items-center gap-2">
          {source ? (
            <button
              type="button"
              aria-label="Replace image"
              onClick={() => inputRef.current?.click()}
              className="press grid size-10 place-items-center rounded-full bg-black/[0.045] transition-colors hover:bg-black/[0.07]"
            >
              <ImageSquare weight="bold" className="size-[18px]" />
            </button>
          ) : null}
          <button
            type="button"
            aria-label="Download PNG"
            disabled={!ready || exporting}
            onClick={() => void handleDownload()}
            className="press grid size-10 place-items-center rounded-full bg-black/[0.045] transition-[background-color,opacity] hover:bg-black/[0.07] disabled:opacity-35"
          >
            <DownloadSimple weight="bold" className="size-[18px]" />
          </button>
          <button
            type="button"
            disabled={!ready || exporting}
            onClick={() => void handlePlace()}
            className="press h-10 rounded-full bg-neutral-900 px-4 text-[14px] font-semibold tracking-[-0.01em] text-white transition-opacity disabled:opacity-35"
          >
            Place
          </button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center px-6 pb-[172px]">
        {source ? (
          preview ? (
            <FloatingSticker
              src={preview}
              holo={filter === "glitter"}
              appearKey={sourceId}
            />
          ) : (
            <div className="size-44 animate-pulse rounded-[36px] bg-black/[0.04]" />
          )
        ) : (
          <EmptyState inputId={inputId} />
        )}

        {error ? (
          <p
            role="alert"
            className="absolute bottom-[184px] left-1/2 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white"
          >
            {error}
          </p>
        ) : null}
      </main>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 px-3 pb-[max(12px,env(safe-area-inset-bottom))]">
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
        />
      </div>

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

function EmptyState({ inputId }: { inputId: string }) {
  return (
    <motion.label
      htmlFor={inputId}
      className="press group flex cursor-pointer flex-col items-center text-center"
      initial={{ opacity: 0, transform: "translateY(8px)" }}
      animate={{ opacity: 1, transform: "translateY(0px)" }}
      transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
    >
      <span className="sticker-float relative mb-7 grid size-36 -rotate-6 place-items-center rounded-[34px] bg-white shadow-[0_24px_40px_-18px_rgba(0,0,0,0.28),0_0_0_1px_rgba(0,0,0,0.05)] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:-rotate-3">
        <span className="grid size-14 place-items-center rounded-full bg-neutral-900 text-white">
          <Plus weight="bold" className="size-6" />
        </span>
      </span>
      <span className="text-[22px] font-semibold tracking-[-0.02em]">
        Add an image
      </span>
      <span className="mt-1.5 max-w-[260px] text-[15px] leading-snug text-neutral-500">
        Logo, product, or artwork. The background is removed for you.
      </span>
      <span className="mt-6 inline-flex h-11 items-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white">
        Choose Photo
      </span>
    </motion.label>
  )
}
