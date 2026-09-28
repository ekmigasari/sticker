import { useEffect, useId, useState, type CSSProperties } from "react"
import { DownloadSimple, UploadSimple, Wall } from "@phosphor-icons/react"
import { useNavigate } from "@tanstack/react-router"
import { motion } from "motion/react"
import { Button, buttonVariants } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"
import {
  downloadDataUrl,
  renderClassicSticker,
} from "@/lib/sticker-process"
import { useWallStore } from "@/store/wall-store"
import type { DraftSticker } from "@/domain/types"

const OUTLINE_PRESETS = ["#ffffff", "#111111", "#0f766e", "#be123c", "#1d4ed8", "#b45309"]

export function StickerGenerator() {
  const inputId = useId()
  const navigate = useNavigate()
  const setDraftSticker = useWallStore((s) => s.setDraftSticker)
  const setPlaceDraft = useWallStore((s) => s.setPlaceDraft)

  const [source, setSource] = useState<string | null>(null)
  const [outlineColor, setOutlineColor] = useState("#ffffff")
  const [outlineThickness, setOutlineThickness] = useState(14)
  const [shadow, setShadow] = useState(true)
  const [punchBg, setPunchBg] = useState(true)
  const [previewBg, setPreviewBg] = useState<"checker" | "solid" | "transparent">(
    "checker"
  )
  const [solidBg, setSolidBg] = useState("#f4e7c8")
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!source) return
    let cancelled = false
    const t = window.setTimeout(() => {
      void renderClassicSticker(source, {
        outlineColor,
        outlineThickness,
        shadow,
        punchLightBackground: punchBg,
        watermark: false,
        solidBackground: null,
      })
        .then((url) => {
          if (!cancelled) {
            setPreview(url)
            setError(null)
            setBusy(false)
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError("Could not process that image.")
            setBusy(false)
          }
        })
    }, 80)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [source, outlineColor, outlineThickness, shadow, punchBg])

  function onFile(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.")
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("Keep uploads under 8MB.")
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      setBusy(true)
      setPreview(null)
      setSource(String(reader.result))
    }
    reader.readAsDataURL(file)
  }

  async function handleDownload() {
    if (!source) return
    const url = await renderClassicSticker(source, {
      outlineColor,
      outlineThickness,
      shadow,
      punchLightBackground: punchBg,
      watermark: true,
      solidBackground: null,
    })
    downloadDataUrl(url, "sticker-wall.png")
  }

  async function handlePutOnWall() {
    if (!source || !preview) return
    const clean = await renderClassicSticker(source, {
      outlineColor,
      outlineThickness,
      shadow,
      punchLightBackground: punchBg,
      watermark: false,
      solidBackground: null,
    })
    const draft: DraftSticker = {
      imageDataUrl: clean,
      outlineColor,
      outlineThickness,
      shadow,
      background: previewBg,
      backgroundColor: solidBg,
    }
    setDraftSticker(draft)
    setPlaceDraft(null)
    void navigate({ to: "/place" })
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="flex flex-col gap-4">
        <div
          className={cn(
            "relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm",
            previewBg === "checker" && "bg-checker",
            previewBg === "solid" && "bg-[var(--preview-solid)]"
          )}
          style={
            previewBg === "solid"
              ? ({ ["--preview-solid" as string]: solidBg } as CSSProperties)
              : undefined
          }
        >
          {!source ? (
            <label
              htmlFor={inputId}
              className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border px-8 py-12 text-center transition-colors hover:border-primary hover:bg-muted/40"
            >
              <UploadSimple weight="bold" className="size-8 text-sticker-teal" />
              <span className="font-heading text-xl font-extrabold">
                Drop your product image
              </span>
              <span className="max-w-xs text-sm text-muted-foreground">
                PNG with transparency works best. Flat light backgrounds get
                punched out automatically.
              </span>
            </label>
          ) : preview ? (
            <motion.img
              key={preview.slice(0, 64)}
              src={preview}
              alt="Sticker preview"
              className="max-h-[420px] max-w-full object-contain drop-shadow-xl"
              initial={{ scale: 0.92, rotate: -2, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            />
          ) : (
            <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
              {busy ? "Cutting sticker…" : "Waiting for preview"}
            </p>
          )}
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </div>
        {error ? (
          <p className="font-mono text-xs text-destructive">{error}</p>
        ) : null}
        {source ? (
          <button
            type="button"
            className="self-start font-mono text-[11px] tracking-widest text-muted-foreground uppercase underline-offset-4 hover:underline"
            onClick={() => {
              setSource(null)
              setPreview(null)
              setBusy(false)
              setError(null)
            }}
          >
            Replace image
          </button>
        ) : null}
      </section>

      <section className="flex flex-col gap-6 rounded-3xl border border-border bg-card/80 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            Classic style
          </p>
          <h2 className="font-heading text-2xl font-extrabold tracking-tight">
            Customize
          </h2>
        </div>

        <div className="space-y-3">
          <Label className="font-mono text-[11px] tracking-widest uppercase">
            Outline color
          </Label>
          <div className="flex flex-wrap gap-2">
            {OUTLINE_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Outline ${c}`}
                onClick={() => setOutlineColor(c)}
                className={cn(
                  "size-8 rounded-full border-2 border-ink/20",
                  outlineColor === c && "ring-2 ring-ring ring-offset-2"
                )}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={outlineColor}
              onChange={(e) => setOutlineColor(e.target.value)}
              className="size-8 cursor-pointer rounded-full border border-border bg-transparent p-0"
              aria-label="Custom outline color"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="font-mono text-[11px] tracking-widest uppercase">
              Outline thickness
            </Label>
            <span className="font-mono text-xs text-muted-foreground">
              {outlineThickness}px
            </span>
          </div>
          <Slider
            value={[outlineThickness]}
            min={4}
            max={28}
            step={1}
            onValueChange={(v) => {
              const n = Array.isArray(v) ? v[0] : v
              setOutlineThickness(Number(n))
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="font-mono text-[11px] tracking-widest uppercase">
              Shadow
            </Label>
            <p className="text-xs text-muted-foreground">Soft drop for depth</p>
          </div>
          <Switch checked={shadow} onCheckedChange={setShadow} />
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <Label className="font-mono text-[11px] tracking-widest uppercase">
              Punch light background
            </Label>
            <p className="text-xs text-muted-foreground">
              Remove near-white backdrops
            </p>
          </div>
          <Switch checked={punchBg} onCheckedChange={setPunchBg} />
        </div>

        <div className="space-y-3">
          <Label className="font-mono text-[11px] tracking-widest uppercase">
            Preview background
          </Label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["checker", "Checker"],
                ["transparent", "None"],
                ["solid", "Solid"],
              ] as const
            ).map(([key, label]) => (
              <Button
                key={key}
                type="button"
                size="sm"
                variant={previewBg === key ? "default" : "outline"}
                className="rounded-xl"
                onClick={() => setPreviewBg(key)}
              >
                {label}
              </Button>
            ))}
            {previewBg === "solid" ? (
              <input
                type="color"
                value={solidBg}
                onChange={(e) => setSolidBg(e.target.value)}
                className="size-9 cursor-pointer rounded-lg border border-border"
                aria-label="Solid preview color"
              />
            ) : null}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-3 pt-2">
          <Button
            type="button"
            size="lg"
            className="w-full rounded-2xl"
            disabled={!preview || busy}
            onClick={() => void handleDownload()}
          >
            <DownloadSimple weight="bold" data-icon="inline-start" />
            Download free
          </Button>
          <button
            type="button"
            disabled={!preview || busy}
            onClick={() => void handlePutOnWall()}
            className={cn(
              buttonVariants({ variant: "secondary", size: "lg" }),
              "w-full rounded-2xl"
            )}
          >
            <Wall weight="bold" data-icon="inline-start" />
            Put on Wall
          </button>
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Free downloads include a light “Made on Sticker Wall” mark. Wall
            placements stay clean.
          </p>
        </div>
      </section>
    </div>
  )
}
