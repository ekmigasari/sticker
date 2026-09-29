import { useEffect, useId, useRef, useState } from "react"
import { Link, useNavigate, useRouteContext } from "@tanstack/react-router"
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
import {
  downloadDataUrl,
  getSourceMaxSide,
  renderSticker,
  SIZE_DEFAULT,
} from "@/lib/sticker-process"
import { useWallStore } from "@/store/wall-store"
import { EditorToolbar, type EditorTab } from "./editor-toolbar"
import { FloatingSticker } from "./floating-sticker"

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [header, data] = dataUrl.split(",")
  const mime = /data:(.*?);/.exec(header)?.[1] || "image/png"
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], fileName, { type: mime })
}

export function StickerGenerator({ productId }: { productId?: string }) {
  const inputId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { session } = useRouteContext({ from: "__root__" })
  const setDraftSticker = useWallStore((s) => s.setDraftSticker)
  const setPlaceDraft = useWallStore((s) => s.setPlaceDraft)

  const [source, setSource] = useState<string | null>(null)
  const [sourceId, setSourceId] = useState(0)
  const [sourceMaxSide, setSourceMaxSide] = useState<number | null>(null)
  const [style, setStyle] = useState<StickerStyle>("none")
  const [filter, setFilter] = useState<StickerFilter>("original")
  const [outlineColor, setOutlineColor] = useState("#FFFFFF")
  const [thickness, setThickness] = useState(16)
  const [removeBackground, setRemoveBackground] = useState(false)
  const [sizePx, setSizePx] = useState(SIZE_DEFAULT)
  const [tab, setTab] = useState<EditorTab>("style")

  const [preview, setPreview] = useState<string | null>(null)
  const [styleThumbs, setStyleThumbs] = useState<
    Partial<Record<StickerStyle, string>>
  >({})
  const [filterThumb, setFilterThumb] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const savingToProduct = Boolean(productId)

  useEffect(() => {
    if (!source) return
    let cancelled = false
    const t = window.setTimeout(() => {
      renderSticker(source, {
        style,
        filter,
        outlineColor,
        outlineThickness: thickness,
        removeBackground,
        maxSide: sizePx,
      })
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
  }, [source, style, filter, outlineColor, thickness, removeBackground, sizePx])

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
            removeBackground,
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
        removeBackground,
        maxSide: 128,
      }).then((url) => {
        if (!cancelled) setFilterThumb(url)
      })
    }, 180)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [source, style, filter, outlineColor, thickness, removeBackground])

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
      const dataUrl = String(reader.result)
      setError(null)
      setPreview(null)
      setStyleThumbs({})
      setFilterThumb(null)
      setRemoveBackground(false)
      setSource(dataUrl)
      setSourceId((n) => n + 1)
      void getSourceMaxSide(dataUrl).then((max) => {
        setSourceMaxSide(max)
        setSizePx(Math.min(SIZE_DEFAULT, Math.max(64, max)))
      })
    }
    reader.readAsDataURL(file)
  }

  async function handleDownload() {
    if (!source) return
    setExporting(true)
    try {
      // Same maxSide as the on-screen preview so download matches what you see.
      const url = await renderSticker(source, {
        style,
        filter,
        outlineColor,
        outlineThickness: thickness,
        removeBackground,
        maxSide: sizePx,
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
        removeBackground,
        maxSide: Math.min(sizePx, 480),
      })
      setDraftSticker({
        imageDataUrl: url,
        style,
        filter,
        outlineColor,
        outlineThickness: thickness,
      })
      setPlaceDraft(null)
      // Wall setup needs an account so sticker details can become a product.
      if (!session) {
        void navigate({ to: "/sign-in", search: { next: "/place" } })
        return
      }
      void navigate({ to: "/place" })
    } finally {
      setExporting(false)
    }
  }

  async function handleSaveToProduct() {
    if (!source || !productId) return
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

      const response = await fetch(`/api/products/${productId}/stickers`, {
        method: "POST",
        body: form,
      })
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        if (response.status === 401) {
          setError("Sign in to save stickers to a product.")
          void navigate({ to: "/sign-in" })
          return
        }
        setError(payload?.error ?? "Could not save sticker.")
        return
      }

      void navigate({
        to: "/dashboard/products/$id",
        params: { id: productId },
      })
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
        {savingToProduct && productId ? (
          <Link
            to="/dashboard/products/$id"
            params={{ id: productId }}
            aria-label="Back to product"
            className="press grid size-10 place-items-center rounded-full bg-black/[0.045] text-neutral-900 transition-colors hover:bg-black/[0.07]"
          >
            <CaretLeft weight="bold" className="size-[18px]" />
          </Link>
        ) : (
          <Link
            to="/"
            aria-label="Back to wall"
            className="press grid size-10 place-items-center rounded-full bg-black/[0.045] text-neutral-900 transition-colors hover:bg-black/[0.07]"
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
          {savingToProduct ? "Save artwork" : "New Sticker"}
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
          {savingToProduct ? (
            <button
              type="button"
              disabled={!ready || exporting}
              onClick={() => void handleSaveToProduct()}
              className="press h-10 rounded-full bg-neutral-900 px-4 text-[14px] font-semibold tracking-[-0.01em] text-white transition-opacity disabled:opacity-35"
            >
              {exporting ? "Saving…" : "Save"}
            </button>
          ) : (
            <button
              type="button"
              disabled={!ready || exporting}
              onClick={() => void handlePlace()}
              className="press h-10 rounded-full bg-neutral-900 px-4 text-[14px] font-semibold tracking-[-0.01em] text-white transition-opacity disabled:opacity-35"
            >
              {session ? "Continue" : "Sign in to place"}
            </button>
          )}
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center px-6 pb-[188px]">
        {source ? (
          preview ? (
            <FloatingSticker
              src={preview}
              holo={filter === "glitter"}
              sizePx={sizePx}
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
            className="absolute bottom-[200px] left-1/2 -translate-x-1/2 rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white"
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
          removeBackground={removeBackground}
          onRemoveBackgroundChange={setRemoveBackground}
          sizePx={sizePx}
          onSizePxChange={setSizePx}
          sourceMaxSide={sourceMaxSide}
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
        Logo, product, or artwork. Remove the background anytime from Style.
      </span>
      <span className="mt-6 inline-flex h-11 items-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white">
        Choose Photo
      </span>
    </motion.label>
  )
}
