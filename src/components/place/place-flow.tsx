import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { Link, useNavigate, useRouteContext } from "@tanstack/react-router"
import {
  ArrowCounterClockwise,
  ArrowsHorizontal,
  ArrowsVertical,
  CaretLeft,
  CaretUp,
  CheckCircle,
  CreditCard,
  FolderSimple,
  GridFour,
  LinkSimple,
  Minus,
  Plus,
  PushPin,
  Sticker as StickerIcon,
  Tag,
  TextAlignLeft,
} from "@phosphor-icons/react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import {
  CATEGORIES,
  PLOT_MIN,
  STICKER_SCALE_FIT_MAX,
  STICKER_SCALE_MAX,
  STICKER_SCALE_MIN,
  STICKER_SIZE_MAX,
  STICKER_SIZE_MIN,
  UNIT_SCALE,
  type Category,
  clampPlotOrigin,
  clampRotationInPlot,
  clampStickerInPlot,
  containStickerSize,
  contentAspectRatio,
  fieldWarning,
  formatPlot,
  plotOriginAtCenter,
  plotPrice,
  plotSideBounds,
  plotUnitsForSticker,
  sizeParamFromContentUnits,
  snapPlotOrigin,
  stickerBoxSize,
  stickerContentUnits,
  unitsToPx,
  validatePlot,
} from "@/domain/types"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AppChrome } from "@/components/layout/app-chrome"
import { cn } from "@/lib/utils"
import { publishPlaceListing } from "@/lib/place-publish"
import { isValidStickerUrl, normalizeStickerUrl } from "@/lib/sticker-meta"
import { probeImageSize } from "@/lib/sticker-process"
import { useWallStore } from "@/store/wall-store"
import { StickerWall } from "@/components/wall/sticker-wall"
import { animateCamera, clampCamera, clampZoom } from "@/components/wall/camera"

type Step = "place" | "details" | "pay" | "done"

/** Matches backend short-description cap in sticker-api. */
const MAX_DESCRIPTION_CHARS = 160

/**
 * Apple-surface styling on top of underline-default UI primitives.
 * Text is 16px on mobile on purpose: smaller makes iOS Safari zoom on focus.
 */
const fieldSurface =
  "h-12 rounded-[14px] border border-black/[0.06] bg-[#f5f5f7] px-4 text-base tracking-[-0.01em] text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-black/15 focus-visible:bg-white focus-visible:ring-0 sm:text-[15px]"

const textareaSurface =
  "min-h-24 rounded-[14px] border border-black/[0.06] bg-[#f5f5f7] px-4 py-3 text-base tracking-[-0.01em] text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-black/15 focus-visible:bg-white focus-visible:ring-0 sm:text-[15px]"

const clampScale = (n: number) =>
  Math.min(STICKER_SCALE_MAX, Math.max(STICKER_SCALE_MIN, n))
/** Sticker mode: the plot hugs the rotated art, so scale may exceed 1. */
const clampFitScale = (n: number) =>
  Math.min(STICKER_SCALE_FIT_MAX, Math.max(STICKER_SCALE_MIN, n))

const clampStickerSize = (n: number) =>
  Math.min(STICKER_SIZE_MAX, Math.max(STICKER_SIZE_MIN, n))

function stripUrlProtocol(raw: string) {
  return raw.replace(/^https?:\/\//i, "")
}

function PlaceShell({
  title,
  backTo,
  onBack,
  backLabel,
  trailing,
  children,
}: {
  title: string
  backTo?: string
  onBack?: () => void
  backLabel?: string
  trailing?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-white font-ui text-neutral-900 antialiased">
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between px-3 pt-[env(safe-area-inset-top)] sm:px-5">
        {onBack ? (
          <button
            type="button"
            aria-label={backLabel ?? "Back"}
            onClick={onBack}
            className="press grid size-11 place-items-center rounded-full bg-black/[0.045] text-neutral-900 hover:bg-black/[0.07]"
          >
            <CaretLeft weight="bold" className="size-[18px]" />
          </button>
        ) : backTo ? (
          <Link
            to={backTo}
            aria-label={backLabel ?? "Back"}
            className="press grid size-11 place-items-center rounded-full bg-black/[0.045] text-neutral-900 hover:bg-black/[0.07]"
          >
            <CaretLeft weight="bold" className="size-[18px]" />
          </Link>
        ) : (
          <span className="size-11" />
        )}
        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold tracking-[-0.01em]">
          {title}
        </h1>
        <div className="flex min-w-11 items-center justify-end gap-2">
          {trailing}
        </div>
      </header>
      {children}
    </div>
  )
}

function parseDim(raw: string): number | null {
  if (raw.trim() === "") return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return Math.round(n)
}

function clampSide(n: number, other: number | null) {
  const { min, max } = plotSideBounds(other)
  return Math.min(max, Math.max(min, n))
}

function DimStepper({
  id,
  value,
  min,
  max,
  invalid,
  onChange,
  onStep,
  onFocus,
  onBlur,
}: {
  id: string
  value: string
  min: number
  max: number
  invalid?: boolean
  onChange: (raw: string) => void
  onStep: (delta: number) => void
  onFocus: () => void
  onBlur: () => void
}) {
  const n = parseDim(value)
  const atMin = n != null && n <= min
  const atMax = n != null && n >= max
  const stepBtn =
    "press grid size-7 shrink-0 place-items-center rounded-full bg-black/[0.06] text-neutral-700 disabled:opacity-30"

  return (
    <div className="flex min-w-0 items-center justify-center gap-1">
      <button
        type="button"
        aria-label="Decrease"
        disabled={atMin}
        onClick={() => onStep(-1)}
        className={stepBtn}
      >
        <Minus weight="bold" className="size-3" />
      </button>
      <input
        id={id}
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => {
          e.currentTarget.select()
          onFocus()
        }}
        onBlur={onBlur}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur()
          if (e.key === "ArrowUp") {
            e.preventDefault()
            onStep(1)
          }
          if (e.key === "ArrowDown") {
            e.preventDefault()
            onStep(-1)
          }
        }}
        aria-invalid={invalid}
        className={cn(
          "h-7 w-[2.75rem] shrink-0 rounded-[8px] border border-black/[0.06] bg-black/[0.04] text-center text-base font-semibold tracking-[-0.02em] text-neutral-900 tabular-nums outline-none focus:border-black/15 focus:bg-white sm:text-[14px]",
          invalid && "border-red-300 bg-red-50 focus:border-red-400"
        )}
      />
      <button
        type="button"
        aria-label="Increase"
        disabled={atMax}
        onClick={() => onStep(1)}
        className={stepBtn}
      >
        <Plus weight="bold" className="size-3" />
      </button>
    </div>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  ariaLabel,
  onChange,
  inputSuffix,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  display: string
  ariaLabel: string
  onChange: (value: number) => void
  /** Shown after the numeric field (e.g. "u", "°", "%"). */
  inputSuffix?: string
}) {
  const [raw, setRaw] = useState(() => String(Math.round(value)))
  const [focused, setFocused] = useState(false)

  function commitRaw() {
    const n = Number(raw)
    if (!Number.isFinite(n)) {
      setRaw(String(Math.round(value)))
      return
    }
    const snapped =
      step >= 1 ? Math.round(n / step) * step : Math.round(n / step) * step
    const clamped = Math.min(max, Math.max(min, snapped))
    onChange(clamped)
    setRaw(String(Math.round(clamped)))
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-11 shrink-0 text-[11px] font-medium text-neutral-500">
        {label}
      </span>
      <SliderPrimitive.Root
        className="min-w-0 flex-1"
        value={value}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0]! : Number(v))}
        aria-label={ariaLabel}
      >
        <SliderPrimitive.Control className="flex h-8 w-full touch-none items-center select-none">
          <SliderPrimitive.Track className="relative h-1 w-full rounded-full bg-black/[0.08]">
            <SliderPrimitive.Indicator className="h-full rounded-full bg-neutral-900" />
            <SliderPrimitive.Thumb className="size-4 rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18),0_0_0_0.5px_rgba(0,0,0,0.08)] transition-transform duration-150 outline-none focus-visible:ring-4 focus-visible:ring-black/10 active:scale-110" />
          </SliderPrimitive.Track>
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
      <div className="flex h-7 w-[3.5rem] shrink-0 items-center rounded-[8px] bg-black/[0.05] px-1.5">
        <input
          type="text"
          inputMode="numeric"
          aria-label={`${ariaLabel} value`}
          value={focused ? raw : String(Math.round(value))}
          onFocus={() => {
            setFocused(true)
            setRaw(String(Math.round(value)))
          }}
          onChange={(e) =>
            setRaw(e.target.value.replace(/[^\d.-]/g, "").slice(0, 5))
          }
          onBlur={() => {
            setFocused(false)
            commitRaw()
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.currentTarget.blur()
            }
          }}
          className="w-full bg-transparent text-center text-[12px] font-semibold text-neutral-900 tabular-nums outline-none"
        />
        {inputSuffix ? (
          <span className="shrink-0 text-[10px] font-medium text-neutral-400">
            {inputSuffix}
          </span>
        ) : null}
      </div>
      <span className="sr-only">{display}</span>
    </div>
  )
}

/** Short enough for the toolbar: $9,999 stays exact, $10,000 becomes $10K. */
function formatPrice(n: number) {
  return n >= 10_000
    ? `$${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n)}`
    : `$${n.toLocaleString("en-US")}`
}

function plotBoxSize(w: number, h: number, stage: number) {
  const maxDim = Math.max(w, h)
  const t = Math.min(1, Math.max(0, (maxDim - PLOT_MIN) / (16 - PLOT_MIN)))
  const fill = 0.7 + 0.26 * t
  const aspect = w / h
  if (aspect >= 1) {
    const width = stage * fill
    return { width, height: width / aspect }
  }
  const height = stage * fill
  return { width: height * aspect, height }
}

function plotGridStyle(w: number, h: number): CSSProperties {
  return {
    backgroundImage: [
      "linear-gradient(to right, rgba(0,0,0,0.1) 1px, transparent 1px)",
      "linear-gradient(to bottom, rgba(0,0,0,0.1) 1px, transparent 1px)",
    ].join(","),
    backgroundSize: `${100 / w}% ${100 / h}%`,
    backgroundPosition: "0 0",
  }
}

function FieldLabel({
  htmlFor,
  icon,
  children,
  hint,
}: {
  htmlFor?: string
  icon: ReactNode
  children: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label
        htmlFor={htmlFor}
        className="nk-label flex items-center gap-1.5 text-neutral-600"
      >
        <span className="grid size-5 place-items-center text-neutral-400">
          {icon}
        </span>
        {children}
      </label>
      {hint ? (
        <span className="text-[12px] text-neutral-400">{hint}</span>
      ) : null}
    </div>
  )
}

function IconWell({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "success" | "accent"
}) {
  return (
    <div
      className={cn(
        "grid size-16 place-items-center rounded-full",
        tone === "success" && "bg-emerald-50 text-emerald-600",
        tone === "accent" && "bg-neutral-900 text-white",
        tone === "neutral" && "bg-black/[0.045] text-neutral-800"
      )}
    >
      {children}
    </div>
  )
}

function PlotPreview({
  src,
  w,
  h,
  valid,
  compact,
  rotation,
}: {
  src: string
  w: number | null
  h: number | null
  valid: boolean
  compact?: boolean
  rotation?: number
}) {
  const stage = compact ? 180 : 300
  const unitsW = w ?? 5
  const unitsH = h ?? 5
  const box = plotBoxSize(unitsW, unitsH, stage)

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        compact ? "py-4" : "py-8"
      )}
    >
      {/* Fixed stage so plot size changes never shift layout below */}
      <div
        className="relative max-w-full shrink-0"
        style={{ width: stage + 32, height: stage + 40 }}
      >
        <div
          className={cn(
            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden",
            !valid && "opacity-45"
          )}
          style={{
            width: box.width,
            height: box.height,
          }}
        >
          <img
            src={src}
            alt="Your sticker"
            className="relative z-10 size-full object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.18)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20"
            style={plotGridStyle(unitsW, unitsH)}
          />
        </div>

        {valid ? (
          <>
            <span className="pointer-events-none absolute top-1/2 left-0 flex -translate-y-1/2 flex-col items-center gap-0.5 text-neutral-400">
              <ArrowsVertical weight="bold" className="size-2.5" />
              <span className="text-[10px] font-medium tabular-nums">
                {unitsH}
              </span>
            </span>
            <span className="pointer-events-none absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-0.5 text-neutral-400">
              <ArrowsHorizontal weight="bold" className="size-2.5" />
              <span className="text-[10px] font-medium tabular-nums">
                {unitsW}
              </span>
            </span>
          </>
        ) : null}
      </div>

      <p className="mt-2 text-[11px] font-medium tracking-[-0.01em] text-neutral-400">
        {valid
          ? [
              formatPlot(unitsW, unitsH),
              `$${plotPrice(unitsW, unitsH).toLocaleString("en-US")}`,
              rotation ? `${Math.round(rotation)}°` : null,
            ]
              .filter(Boolean)
              .join(" · ")
          : "Plot size missing — go back to the wall"}
      </p>
    </div>
  )
}

export function PlaceFlow() {
  const navigate = useNavigate()
  const { session } = useRouteContext({ from: "__root__" })
  const draftSticker = useWallStore((s) => s.draftSticker)
  const placeDraft = useWallStore((s) => s.placeDraft)
  const setDraftSticker = useWallStore((s) => s.setDraftSticker)
  const setPlaceDraft = useWallStore((s) => s.setPlaceDraft)
  const confirmPlacement = useWallStore((s) => s.confirmPlacement)
  const hydrate = useWallStore((s) => s.hydrate)

  const hasSpot =
    placeDraft?.x != null &&
    placeDraft?.y != null &&
    Number.isFinite(placeDraft.x) &&
    Number.isFinite(placeDraft.y)

  const contentAspect = contentAspectRatio(
    draftSticker?.widthPx,
    draftSticker?.heightPx
  )

  const initialStickerSize = (() => {
    if (
      placeDraft?.stickerScale != null &&
      placeDraft.unitsW &&
      placeDraft.unitsH
    ) {
      const box = stickerBoxSize(
        unitsToPx(placeDraft.unitsW),
        unitsToPx(placeDraft.unitsH),
        placeDraft.stickerScale,
        contentAspect
      )
      return sizeParamFromContentUnits(box.w / UNIT_SCALE, box.h / UNIT_SCALE)
    }
    // A fresh sticker starts at the smallest plot (3×3); the user sizes up from there.
    return STICKER_SIZE_MIN
  })()

  const initialPlotFromSticker = (() => {
    if (placeDraft?.unitsW && placeDraft?.unitsH) {
      return { w: placeDraft.unitsW, h: placeDraft.unitsH }
    }
    const content = stickerContentUnits(initialStickerSize, contentAspect)
    const rot = placeDraft?.rotation ?? 0
    const needed = plotUnitsForSticker(
      unitsToPx(content.unitsW),
      unitsToPx(content.unitsH),
      rot
    )
    return { w: needed.unitsW, h: needed.unitsH }
  })()

  const [step, setStep] = useState<Step>(() => (hasSpot ? "details" : "place"))
  const [widthRaw, setWidthRaw] = useState(() =>
    String(initialPlotFromSticker.w)
  )
  const [heightRaw, setHeightRaw] = useState(() =>
    String(initialPlotFromSticker.h)
  )
  const [name, setName] = useState(placeDraft?.details?.name ?? "")
  const [oneLiner, setOneLiner] = useState(placeDraft?.details?.oneLiner ?? "")
  const [url, setUrl] = useState(() =>
    placeDraft?.details?.url
      ? placeDraft.details.url.replace(/^https?:\/\//i, "")
      : ""
  )
  const [category, setCategory] = useState<Category>(
    placeDraft?.details?.category ?? "Developer Tools"
  )
  const [paying, setPaying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)
  const [pendingSpot, setPendingSpot] = useState<{
    x: number
    y: number
  } | null>(null)
  const [pendingRotation, setPendingRotation] = useState(
    () => placeDraft?.rotation ?? 0
  )
  const [stickerScale, setStickerScale] = useState(
    () => placeDraft?.stickerScale ?? 1
  )
  const [stickerSize, setStickerSize] = useState(() =>
    clampStickerSize(initialStickerSize)
  )
  const [stickerOffsetX, setStickerOffsetX] = useState(
    () => placeDraft?.stickerOffsetX ?? 0
  )
  const [stickerOffsetY, setStickerOffsetY] = useState(
    () => placeDraft?.stickerOffsetY ?? 0
  )
  const [editTarget, setEditTarget] = useState<"area" | "sticker">("sticker")
  const [activeDim, setActiveDim] = useState<"w" | "h" | null>(null)
  const [justDropped, setJustDropped] = useState(false)
  /** Bottom controller: fine controls expanded or folded to the toolbar. */
  const [panelOpen, setPanelOpen] = useState(true)

  const sheetRef = useRef<HTMLDivElement>(null)
  const dropTimer = useRef<number | undefined>(undefined)
  const lastPlot = useRef({
    w: initialPlotFromSticker.w,
    h: initialPlotFromSticker.h,
  })
  /** World-space sticker centre — kept stable across resize/rotate so the view doesn't jump. */
  const stickerCenterRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => () => window.clearTimeout(dropTimer.current), [])

  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Older drafts may lack pixel size — probe once so aspect-correct layout works.
  useEffect(() => {
    if (!draftSticker?.imageDataUrl) return
    if (draftSticker.widthPx && draftSticker.heightPx) return
    let cancelled = false
    void probeImageSize(draftSticker.imageDataUrl).then((size) => {
      if (cancelled) return
      setDraftSticker({
        ...draftSticker,
        widthPx: size.width,
        heightPx: size.height,
      })
    })
    return () => {
      cancelled = true
    }
  }, [draftSticker, setDraftSticker])

  // After choosing a spot, require sign-in before the details form.
  useEffect(() => {
    if (!draftSticker || !hasSpot || session) return
    if (step === "details" || step === "pay") {
      void navigate({ to: "/sign-in", search: { next: "/place" } })
    }
  }, [draftSticker, hasSpot, session, step, navigate])

  const unitsW = parseDim(widthRaw)
  const unitsH = parseDim(heightRaw)
  const plotCheck =
    unitsW != null && unitsH != null
      ? validatePlot(unitsW, unitsH)
      : { ok: false as const, reason: "Enter width and height." }
  const plotValid = plotCheck.ok && unitsW != null && unitsH != null
  const price = plotValid ? plotPrice(unitsW!, unitsH!) : null

  // While the user is mid-typing (e.g. "1" on the way to "12"), the raw fields can
  // be momentarily invalid. Everything on the wall uses the last valid size so the
  // plot never flickers or resets under their fingers.
  if (plotValid) lastPlot.current = { w: unitsW!, h: unitsH! }
  const curW = plotValid ? unitsW! : lastPlot.current.w
  const curH = plotValid ? unitsH! : lastPlot.current.h
  const curPrice = plotPrice(curW, curH)

  const widthWarn = fieldWarning(unitsW, unitsH, "width")
  const heightWarn = fieldWarning(unitsH, unitsW, "height")

  const canContinue = useMemo(() => {
    const chars = oneLiner.trim().length
    return (
      plotCheck.ok &&
      name.trim().length > 1 &&
      chars > 3 &&
      chars <= MAX_DESCRIPTION_CHARS &&
      isValidStickerUrl(url)
    )
  }, [plotCheck.ok, name, oneLiner, url])

  // When a spot is pinned, bring it into the clear area above the bottom sheet.
  // Without this the sticker usually ends up hidden behind the controls on phones.
  const hasPending = pendingSpot != null
  useLayoutEffect(() => {
    if (!hasPending || !pendingSpot) return
    const vw = window.innerWidth
    const vh = window.innerHeight
    const sheetH = sheetRef.current?.getBoundingClientRect().height ?? 260
    const topInset = 132 // header + hint pill
    const bottomInset = sheetH + 28
    const visH = Math.max(160, vh - topInset - bottomInset)
    const plotW = unitsToPx(curW)
    const plotH = unitsToPx(curH)
    const cam = useWallStore.getState().camera

    // Keep the user's zoom; only zoom out if the plot wouldn't fit the clear area.
    const fitZoom = Math.min((vw * 0.7) / plotW, (visH * 0.8) / plotH)
    const targetZoom = clampZoom(Math.min(cam.zoom, fitZoom), vw, vh)

    const cx = pendingSpot.x + plotW / 2
    const cy = pendingSpot.y + plotH / 2
    // Put the plot centre at the centre of the visible region (screen y = topInset + visH/2).
    const next = clampCamera(
      cx,
      cy - (topInset + visH / 2 - vh / 2) / targetZoom,
      targetZoom,
      vw,
      vh
    )
    animateCamera({ x: next.x, y: next.y, zoom: targetZoom }, 360)
    // Only when the pin first appears; later resizing shouldn't yank the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPending])

  function onUrlChange(raw: string) {
    setUrl(stripUrlProtocol(raw))
  }

  function onOneLinerChange(raw: string) {
    setOneLiner(raw.slice(0, MAX_DESCRIPTION_CHARS))
  }

  function goPay() {
    if (!draftSticker || !plotValid) {
      return
    }
    if (placeDraft?.x == null || placeDraft?.y == null) {
      setStep("place")
      return
    }
    const normalizedUrl = normalizeStickerUrl(url)
    if (!normalizedUrl) return
    setPlaceDraft({
      sticker: draftSticker,
      unitsW: unitsW!,
      unitsH: unitsH!,
      x: placeDraft.x,
      y: placeDraft.y,
      stickerScale: placeDraft.stickerScale ?? 1,
      rotation: placeDraft.rotation ?? 0,
      stickerOffsetX: placeDraft.stickerOffsetX ?? 0,
      stickerOffsetY: placeDraft.stickerOffsetY ?? 0,
      details: {
        name: name.trim(),
        oneLiner: oneLiner.trim(),
        url: normalizedUrl,
        category,
      },
    })
    setStep("pay")
  }

  /** Confirm pin → auth / details. */
  function onChooseSpot(x: number, y: number) {
    if (!draftSticker) return
    const size = { w: curW, h: curH }

    const plotW = unitsToPx(size.w)
    const plotH = unitsToPx(size.h)
    const clamped = clampStickerInPlot(
      plotW,
      plotH,
      stickerScale,
      pendingRotation,
      stickerOffsetX,
      stickerOffsetY,
      contentAspect
    )
    const pos = snapPlotOrigin(x, y, size.w, size.h)
    setPlaceDraft({
      sticker: draftSticker,
      unitsW: size.w,
      unitsH: size.h,
      x: pos.x,
      y: pos.y,
      stickerScale: clamped.scale,
      rotation: pendingRotation,
      stickerOffsetX: clamped.offsetX,
      stickerOffsetY: clamped.offsetY,
      details: placeDraft?.details,
    })
    setPendingSpot(null)
    setPendingRotation(0)
    setStickerScale(1)
    setStickerOffsetX(0)
    setStickerOffsetY(0)

    if (!session) {
      void navigate({ to: "/sign-in", search: { next: "/place" } })
      return
    }
    setStep("details")
  }

  function currentStickerCenter(): { x: number; y: number } | null {
    if (stickerCenterRef.current) return stickerCenterRef.current
    if (!pendingSpot) return null
    return {
      x: pendingSpot.x + unitsToPx(curW) / 2 + stickerOffsetX,
      y: pendingSpot.y + unitsToPx(curH) / 2 + stickerOffsetY,
    }
  }

  function rememberStickerCenter(cx: number, cy: number) {
    stickerCenterRef.current = { x: cx, y: cy }
  }

  function requestSpot(x: number, y: number) {
    // Seed plot from free sticker size (not a locked max-area fraction).
    const content = stickerContentUnits(stickerSize, contentAspect)
    const needed = plotUnitsForSticker(
      unitsToPx(content.unitsW),
      unitsToPx(content.unitsH),
      pendingRotation
    )
    const pos = snapPlotOrigin(x, y, needed.unitsW, needed.unitsH)
    const plotW = unitsToPx(needed.unitsW)
    const plotH = unitsToPx(needed.unitsH)
    const full = containStickerSize(plotW, plotH, contentAspect)
    const scale = clampFitScale(
      Math.min(
        unitsToPx(content.unitsW) / Math.max(1e-9, full.w),
        unitsToPx(content.unitsH) / Math.max(1e-9, full.h)
      )
    )
    lastPlot.current = { w: needed.unitsW, h: needed.unitsH }
    setWidthRaw(String(needed.unitsW))
    setHeightRaw(String(needed.unitsH))
    setStickerScale(scale)
    setStickerOffsetX(0)
    setStickerOffsetY(0)
    setEditTarget("sticker")
    setPendingSpot(pos)
    rememberStickerCenter(pos.x + plotW / 2, pos.y + plotH / 2)
    setJustDropped(true)
    window.clearTimeout(dropTimer.current)
    dropTimer.current = window.setTimeout(() => setJustDropped(false), 280)
  }

  function clearPendingSpot() {
    setPendingSpot(null)
    setPendingRotation(0)
    setStickerScale(1)
    setStickerOffsetX(0)
    setStickerOffsetY(0)
    setEditTarget("sticker")
    stickerCenterRef.current = null
    const content = stickerContentUnits(stickerSize, contentAspect)
    const needed = plotUnitsForSticker(
      unitsToPx(content.unitsW),
      unitsToPx(content.unitsH),
      0
    )
    setWidthRaw(String(needed.unitsW))
    setHeightRaw(String(needed.unitsH))
    lastPlot.current = { w: needed.unitsW, h: needed.unitsH }
  }

  function confirmPendingSpot() {
    if (!pendingSpot) return
    onChooseSpot(pendingSpot.x, pendingSpot.y)
  }

  /**
   * Resize plot (area mode). When area shrinks, sticker shrinks to fit.
   * When area grows, sticker keeps its current pixel size (does not grow).
   */
  function applyPlotSize(
    nextW: number,
    nextH: number,
    origin?: { x: number; y: number }
  ) {
    if (!validatePlot(nextW, nextH).ok) return
    const oldBox = stickerBoxSize(
      unitsToPx(curW),
      unitsToPx(curH),
      stickerScale,
      contentAspect
    )
    const newPlotW = unitsToPx(nextW)
    const newPlotH = unitsToPx(nextH)
    const full = containStickerSize(newPlotW, newPlotH, contentAspect)
    // Preserve absolute sticker size, then clamp if it no longer fits.
    const preservedScale = clampScale(
      Math.min(
        oldBox.w / Math.max(1e-9, full.w),
        oldBox.h / Math.max(1e-9, full.h)
      )
    )
    const clamped = clampStickerInPlot(
      newPlotW,
      newPlotH,
      preservedScale,
      pendingRotation,
      stickerOffsetX,
      stickerOffsetY,
      contentAspect
    )

    const base = origin ?? pendingSpot
    if (base) {
      const pos = snapPlotOrigin(base.x, base.y, nextW, nextH)
      setPendingSpot(pos)
      rememberStickerCenter(
        pos.x + newPlotW / 2 + clamped.offsetX,
        pos.y + newPlotH / 2 + clamped.offsetY
      )
    }
    lastPlot.current = { w: nextW, h: nextH }
    setWidthRaw(String(nextW))
    setHeightRaw(String(nextH))
    setStickerScale(clamped.scale)
    setStickerOffsetX(clamped.offsetX)
    setStickerOffsetY(clamped.offsetY)
    setStickerSize(
      sizeParamFromContentUnits(
        (full.w * clamped.scale) / UNIT_SCALE,
        (full.h * clamped.scale) / UNIT_SCALE
      )
    )
  }

  /**
   * Sticker mode: set absolute content size (units) and grow/shrink the plot
   * tightly around the rotated artwork. World centre stays locked so the
   * sticker doesn't crawl across the screen while resizing.
   */
  function applyStickerContent(nextSize: number, nextRot: number) {
    const size = clampStickerSize(nextSize)
    const content = stickerContentUnits(size, contentAspect)
    const contentW = unitsToPx(content.unitsW)
    const contentH = unitsToPx(content.unitsH)
    const center = currentStickerCenter()
    const rot = Math.abs(nextRot) < 0.5 ? 0 : nextRot

    const needed = plotUnitsForSticker(contentW, contentH, rot)
    const newPlotW = unitsToPx(needed.unitsW)
    const newPlotH = unitsToPx(needed.unitsH)
    const full = containStickerSize(newPlotW, newPlotH, contentAspect)
    const scale = clampFitScale(
      Math.min(
        contentW / Math.max(1e-9, full.w),
        contentH / Math.max(1e-9, full.h)
      )
    )

    if (center) {
      // Keep the visual centre fixed — no grid-snap crawl during live edits.
      const pos = plotOriginAtCenter(
        center.x,
        center.y,
        needed.unitsW,
        needed.unitsH
      )
      setPendingSpot(pos)
      // If the wall edge forced a clamp, compensate with offset so the sticker
      // still sits on the remembered screen/world centre whenever possible.
      setStickerOffsetX(center.x - (pos.x + newPlotW / 2))
      setStickerOffsetY(center.y - (pos.y + newPlotH / 2))
      rememberStickerCenter(center.x, center.y)
    } else {
      setStickerOffsetX(0)
      setStickerOffsetY(0)
    }

    lastPlot.current = { w: needed.unitsW, h: needed.unitsH }
    setWidthRaw(String(needed.unitsW))
    setHeightRaw(String(needed.unitsH))
    setPendingRotation(rot)
    setStickerScale(scale)
    setStickerSize(size)
  }

  /** Snap plot to pricing grid after a transform ends (pointer up). */
  function snapPendingPlot() {
    if (!pendingSpot) return
    const pos = snapPlotOrigin(pendingSpot.x, pendingSpot.y, curW, curH)
    setPendingSpot(pos)
    const cx = pos.x + unitsToPx(curW) / 2 + stickerOffsetX
    const cy = pos.y + unitsToPx(curH) / 2 + stickerOffsetY
    rememberStickerCenter(cx, cy)
  }

  // Typing: keep the raw text exactly as typed and only apply values that are
  // already valid. Out-of-range values wait for blur, where they're clamped.
  // (Previously every keystroke was clamped/reset, so "12" was impossible to type.)
  function onWidthChange(raw: string) {
    const cleaned = raw.replace(/[^\d]/g, "").slice(0, 3)
    setWidthRaw(cleaned)
    const w = parseDim(cleaned)
    if (w == null || !pendingSpot) return
    const { min, max } = plotSideBounds(curH)
    if (w < min || w > max) return
    applyPlotSize(w, clampSide(curH, w))
  }

  function onHeightChange(raw: string) {
    const cleaned = raw.replace(/[^\d]/g, "").slice(0, 3)
    setHeightRaw(cleaned)
    const h = parseDim(cleaned)
    if (h == null || !pendingSpot) return
    const { min, max } = plotSideBounds(curW)
    if (h < min || h > max) return
    applyPlotSize(clampSide(curW, h), h)
  }

  function commitDims() {
    // Snap whatever is in the fields to the nearest valid plot.
    const w = clampSide(parseDim(widthRaw) ?? curW, curH)
    const h = clampSide(parseDim(heightRaw) ?? curH, w)
    if (w === curW && h === curH) {
      setWidthRaw(String(curW))
      setHeightRaw(String(curH))
      return
    }
    applyPlotSize(w, h)
  }

  function stepWidth(delta: number) {
    const next = clampSide(curW + delta, curH)
    setActiveDim("w")
    applyPlotSize(next, clampSide(curH, next))
  }

  function stepHeight(delta: number) {
    const next = clampSide(curH + delta, curW)
    setActiveDim("h")
    applyPlotSize(clampSide(curW, next), next)
  }

  function setRotation(deg: number) {
    let next = deg
    if (Math.abs(next) < 0.5) next = 0
    if (editTarget === "area") {
      // Area mode: keep size; stop rotating when the artwork hits the border.
      const limited = clampRotationInPlot(
        unitsToPx(curW),
        unitsToPx(curH),
        stickerScale,
        pendingRotation,
        next,
        stickerOffsetX,
        stickerOffsetY,
        contentAspect
      )
      const rot = Math.abs(limited) < 0.5 ? 0 : limited
      setPendingRotation(rot)
      const center = currentStickerCenter()
      if (center) rememberStickerCenter(center.x, center.y)
      return
    }
    // Sticker mode: area grows with rotation; no border stop.
    applyStickerContent(stickerSize, next)
  }

  function onStickerScale(next: number) {
    if (editTarget === "area") {
      const clamped = clampStickerInPlot(
        unitsToPx(curW),
        unitsToPx(curH),
        next,
        pendingRotation,
        stickerOffsetX,
        stickerOffsetY,
        contentAspect
      )
      setStickerScale(clamped.scale)
      setStickerOffsetX(clamped.offsetX)
      setStickerOffsetY(clamped.offsetY)
      const full = containStickerSize(
        unitsToPx(curW),
        unitsToPx(curH),
        contentAspect
      )
      setStickerSize(
        sizeParamFromContentUnits(
          (full.w * clamped.scale) / UNIT_SCALE,
          (full.h * clamped.scale) / UNIT_SCALE
        )
      )
      return
    }
    applyStickerContent(next, pendingRotation)
  }

  function onStickerOffset(ox: number, oy: number) {
    const clamped = clampStickerInPlot(
      unitsToPx(curW),
      unitsToPx(curH),
      stickerScale,
      pendingRotation,
      ox,
      oy,
      contentAspect
    )
    setStickerScale(clamped.scale)
    setStickerOffsetX(clamped.offsetX)
    setStickerOffsetY(clamped.offsetY)
    if (pendingSpot) {
      rememberStickerCenter(
        pendingSpot.x + unitsToPx(curW) / 2 + clamped.offsetX,
        pendingSpot.y + unitsToPx(curH) / 2 + clamped.offsetY
      )
    }
  }

  function setAreaMode(on: boolean) {
    if (on === (editTarget === "area")) return
    setEditTarget(on ? "area" : "sticker")
    if (on) {
      // Entering area mode: keep sticker inside current plot (full contain at max).
      onStickerOffset(stickerOffsetX, stickerOffsetY)
    } else {
      // Back to sticker mode: free size; plot hugs the artwork.
      const center = currentStickerCenter()
      if (center) rememberStickerCenter(center.x, center.y)
      applyStickerContent(stickerSize, pendingRotation)
    }
  }

  function onGhostMove(x: number, y: number) {
    // Follow the pointer freely; snapPendingPlot settles onto the grid on release.
    const pos = clampPlotOrigin(x, y, curW, curH)
    setPendingSpot(pos)
    rememberStickerCenter(
      pos.x + unitsToPx(curW) / 2 + stickerOffsetX,
      pos.y + unitsToPx(curH) / 2 + stickerOffsetY
    )
  }

  function onGhostResize(nextW: number, nextH: number, x: number, y: number) {
    applyPlotSize(nextW, nextH, { x, y })
  }

  async function finalizePlacement() {
    if (!draftSticker || saving) return
    const draft = useWallStore.getState().placeDraft
    if (
      !draft?.details ||
      draft.x == null ||
      draft.y == null ||
      !Number.isFinite(draft.x) ||
      !Number.isFinite(draft.y)
    ) {
      setSaveError("Pick a spot on the wall first.")
      setStep("place")
      return
    }

    setSaving(true)
    setSaveError(null)
    try {
      const published = await publishPlaceListing({
        details: draft.details,
        sticker: draft.sticker,
      })
      const placement = confirmPlacement(draft.x, draft.y, {
        stickerId: published.stickerId,
        slug: published.slug,
      })
      if (!placement) {
        throw new Error("Could not place sticker on the wall.")
      }
      setSavedSlug(published.slug)
      setStep("done")
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save sticker."
      )
    } finally {
      setSaving(false)
      setPaying(false)
    }
  }

  function mockPay() {
    if (paying || saving) return
    setPaying(true)
    window.setTimeout(() => {
      void finalizePlacement()
    }, 900)
  }

  if (step === "done") {
    return (
      <PlaceShell title="Placed">
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 pb-16 text-center">
          <IconWell tone="success">
            <CheckCircle weight="fill" className="size-8" />
          </IconWell>
          <h2 className="text-[32px] font-semibold tracking-[-0.03em] text-neutral-900 sm:text-[36px]">
            You&apos;re on the wall
          </h2>
          <p className="max-w-sm text-[15px] leading-relaxed text-neutral-500">
            Your placement is permanent. Newer stickers can cover it —
            that&apos;s the game. Your sticker is in the directory either way.
          </p>
          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              type="button"
              className="press inline-flex h-11 items-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white"
              onClick={() => {
                setDraftSticker(null)
                void navigate({ to: "/" })
              }}
            >
              See the wall
            </button>
            {savedSlug ? (
              <Link
                to="/sticker/$slug"
                params={{ slug: savedSlug }}
                className="press inline-flex h-11 items-center rounded-full bg-black/[0.06] px-6 text-[15px] font-semibold text-neutral-900"
                onClick={() => setDraftSticker(null)}
              >
                View listing
              </Link>
            ) : (
              <Link
                to="/directory"
                className="press inline-flex h-11 items-center rounded-full bg-black/[0.06] px-6 text-[15px] font-semibold text-neutral-900"
                onClick={() => setDraftSticker(null)}
              >
                Open directory
              </Link>
            )}
          </div>
        </main>
      </PlaceShell>
    )
  }

  if (step === "place" && draftSticker) {
    const areaMode = editTarget === "area"

    return (
      <AppChrome variant="wall">
        <div className="relative h-[100dvh] font-ui">
          <div className="pointer-events-none absolute top-[calc(env(safe-area-inset-top)+4rem)] right-3 left-3 z-30 flex justify-center sm:top-[calc(env(safe-area-inset-top)+4.5rem)]">
            <div className="pointer-events-auto flex max-w-md items-center gap-3 rounded-full border border-black/[0.06] bg-white/85 py-2.5 pr-5 pl-2.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-neutral-900 text-white">
                <PushPin weight="fill" className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-neutral-900">
                  {pendingSpot
                    ? areaMode
                      ? "Edit Area"
                      : "Edit Sticker"
                    : "Tap the wall to place your sticker"}
                </p>
                <p className="truncate text-[12px] text-neutral-500">
                  {pendingSpot
                    ? areaMode
                      ? "Resize the area or sticker position"
                      : "Move, size, or rotate sticker"
                    : "Drag to pan · pinch or scroll to zoom"}
                </p>
              </div>
            </div>
          </div>

          <StickerWall
            placeMode
            hideControls
            showPlaceZoom
            showPlotChrome={areaMode}
            ghostW={unitsToPx(curW)}
            ghostH={unitsToPx(curH)}
            ghostUnitsW={curW}
            ghostUnitsH={curH}
            ghostStickerScale={stickerScale}
            ghostContentAspect={contentAspect}
            ghostRotation={pendingRotation}
            ghostOffsetX={stickerOffsetX}
            ghostOffsetY={stickerOffsetY}
            ghostImage={draftSticker.imageDataUrl}
            pinnedGhost={pendingSpot}
            editTarget={editTarget}
            onEditTarget={(t) => setAreaMode(t === "area")}
            onPlace={requestSpot}
            onGhostMove={areaMode ? undefined : onGhostMove}
            onGhostResize={onGhostResize}
            onGhostRotate={setRotation}
            onGhostStickerScale={
              areaMode
                ? onStickerScale
                : (s) => onStickerScale(clampStickerSize(s))
            }
            onGhostStickerSize={
              areaMode
                ? undefined
                : (size, center) => {
                    rememberStickerCenter(center.x, center.y)
                    onStickerScale(clampStickerSize(size))
                  }
            }
            ghostStickerSize={stickerSize}
            onGhostStickerOffset={areaMode ? onStickerOffset : undefined}
            onGhostTransformEnd={snapPendingPlot}
          />

          {pendingSpot ? (
            <div
              data-ui-chrome
              className="pointer-events-none absolute right-3 bottom-3 left-3 z-30 flex justify-center pb-[env(safe-area-inset-bottom)] sm:bottom-5"
            >
              <div
                ref={sheetRef}
                className={cn(
                  "pointer-events-auto w-full max-w-[22rem] overflow-hidden rounded-[24px] border border-white/70 bg-white/75 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(0,0,0,0.08)] backdrop-blur-2xl backdrop-saturate-[1.8]",
                  justDropped && "animate-[place-pop_280ms_ease-out]"
                )}
              >
                {/* Fine controls fold away so the sticker stays in view. */}
                <div
                  id="place-controls"
                  inert={!panelOpen}
                  className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
                    panelOpen
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="flex flex-col gap-0.5 px-3 pt-2.5 pb-0.5">
                      {areaMode ? (
                        <div className="flex items-center justify-between gap-1 pb-1">
                          <label
                            htmlFor="place-w"
                            className="flex items-center gap-1 text-neutral-400"
                          >
                            <ArrowsHorizontal
                              weight="bold"
                              className="size-3"
                            />
                            <span className="sr-only">Width</span>
                          </label>
                          <DimStepper
                            id="place-w"
                            value={widthRaw}
                            min={plotSideBounds(curH).min}
                            max={plotSideBounds(curH).max}
                            invalid={Boolean(widthWarn) && activeDim === "w"}
                            onChange={onWidthChange}
                            onStep={stepWidth}
                            onFocus={() => setActiveDim("w")}
                            onBlur={() => {
                              setActiveDim((d) => (d === "w" ? null : d))
                              commitDims()
                            }}
                          />
                          <span
                            aria-hidden
                            className="text-[13px] font-medium text-neutral-300"
                          >
                            ×
                          </span>
                          <label
                            htmlFor="place-h"
                            className="flex items-center gap-1 text-neutral-400"
                          >
                            <ArrowsVertical weight="bold" className="size-3" />
                            <span className="sr-only">Height</span>
                          </label>
                          <DimStepper
                            id="place-h"
                            value={heightRaw}
                            min={plotSideBounds(curW).min}
                            max={plotSideBounds(curW).max}
                            invalid={Boolean(heightWarn) && activeDim === "h"}
                            onChange={onHeightChange}
                            onStep={stepHeight}
                            onFocus={() => setActiveDim("h")}
                            onBlur={() => {
                              setActiveDim((d) => (d === "h" ? null : d))
                              commitDims()
                            }}
                          />
                        </div>
                      ) : null}
                      {areaMode ? (
                        <SliderRow
                          label="Size"
                          value={Math.round(stickerScale * 100)}
                          min={Math.round(STICKER_SCALE_MIN * 100)}
                          max={Math.round(STICKER_SCALE_MAX * 100)}
                          step={5}
                          display={`${Math.round(stickerScale * 100)}%`}
                          inputSuffix="%"
                          ariaLabel="Sticker size within area"
                          onChange={(n) => onStickerScale(clampScale(n / 100))}
                        />
                      ) : (
                        <SliderRow
                          label="Size"
                          value={stickerSize}
                          min={STICKER_SIZE_MIN}
                          max={STICKER_SIZE_MAX}
                          step={1}
                          display={`${Math.round(stickerSize)}u`}
                          inputSuffix="u"
                          ariaLabel="Sticker size in units"
                          onChange={(n) => onStickerScale(clampStickerSize(n))}
                        />
                      )}
                      <SliderRow
                        label="Rotate"
                        value={pendingRotation}
                        min={-180}
                        max={180}
                        step={1}
                        display={`${Math.round(pendingRotation)}°`}
                        inputSuffix="°"
                        ariaLabel={
                          areaMode
                            ? "Sticker rotation within area"
                            : "Sticker rotation"
                        }
                        onChange={setRotation}
                      />
                    </div>
                  </div>
                </div>

                {/* Toolbar: always visible, sized for a thumb. */}
                <div className="flex items-center gap-1 p-1.5">
                  <div
                    role="group"
                    aria-label="What to edit"
                    className="flex h-9 items-center rounded-full bg-black/[0.06] p-0.5"
                  >
                    {(["sticker", "area"] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={editTarget === t}
                        onClick={() => setAreaMode(t === "area")}
                        className={cn(
                          "press h-8 rounded-full px-2.5 text-[12px] font-semibold capitalize transition-colors",
                          editTarget === t
                            ? "bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                            : "text-neutral-500 hover:text-neutral-800"
                        )}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={clearPendingSpot}
                    aria-label="Reset placement"
                    title="Reset"
                    className="press grid size-8 shrink-0 place-items-center rounded-full text-neutral-600 transition-colors hover:bg-black/[0.05] hover:text-neutral-900"
                  >
                    <ArrowCounterClockwise weight="bold" className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPanelOpen((o) => !o)}
                    aria-expanded={panelOpen}
                    aria-controls="place-controls"
                    aria-label={panelOpen ? "Hide controls" : "Show controls"}
                    title={panelOpen ? "Hide controls" : "Show controls"}
                    className="press grid size-8 shrink-0 place-items-center rounded-full text-neutral-600 transition-colors hover:bg-black/[0.05] hover:text-neutral-900"
                  >
                    <CaretUp
                      weight="bold"
                      className={cn(
                        "size-4 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
                        panelOpen && "rotate-180"
                      )}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={confirmPendingSpot}
                    aria-label={`Confirm for $${curPrice.toLocaleString()}`}
                    className="press flex h-9 min-w-0 shrink items-center gap-1.5 rounded-full bg-neutral-900 px-3 text-[13px] font-semibold whitespace-nowrap text-white"
                  >
                    Confirm
                    <span className="min-w-0 truncate font-medium text-white/60 tabular-nums">
                      {formatPrice(curPrice)}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <style>{`@keyframes place-pop{from{transform:translateY(8px) scale(0.98);opacity:0.85}to{transform:translateY(0) scale(1);opacity:1}}`}</style>
      </AppChrome>
    )
  }

  if (!draftSticker) {
    return (
      <PlaceShell title="Place" backTo="/make" backLabel="Back to make">
        <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 text-center">
          <IconWell>
            <StickerIcon weight="fill" className="size-7" />
          </IconWell>
          <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-neutral-900">
            No sticker yet
          </h2>
          <p className="max-w-xs text-[15px] leading-relaxed text-neutral-500">
            Make a sticker first, then come back to place it on the wall.
          </p>
          <Link
            to="/make"
            className="press inline-flex h-11 items-center gap-1.5 rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white"
          >
            <Plus weight="bold" className="size-4" />
            Create sticker
          </Link>
        </main>
      </PlaceShell>
    )
  }

  return (
    <PlaceShell
      title={step === "pay" ? "Checkout" : "Place sticker"}
      onBack={
        step === "pay"
          ? () => setStep("details")
          : () => {
              // Clear spot so the wall place step can be used again.
              if (placeDraft) {
                setPlaceDraft({
                  ...placeDraft,
                  x: undefined,
                  y: undefined,
                })
              }
              setStep("place")
            }
      }
      backLabel={step === "pay" ? "Back to details" : "Back to wall"}
      trailing={
        step === "details" && price != null ? (
          <span className="rounded-full bg-black/[0.045] px-3 py-1.5 text-[13px] font-semibold tracking-[-0.01em] text-neutral-800 tabular-nums">
            ${price}
          </span>
        ) : null
      }
    >
      <main className="relative min-h-0 flex-1 overflow-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pt-1 pb-[max(28px,env(safe-area-inset-bottom))] sm:px-6">
          <PlotPreview
            src={draftSticker.imageDataUrl}
            w={unitsW}
            h={unitsH}
            valid={plotCheck.ok}
            compact={step === "pay"}
            rotation={placeDraft?.rotation}
          />

          {step === "details" ? (
            <div className="flex flex-col gap-6">
              <section className="space-y-4">
                <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-neutral-900">
                  Sticker details
                </h2>

                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="name"
                    icon={<Tag weight="bold" className="size-3.5" />}
                  >
                    Title
                  </FieldLabel>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="ShipKit"
                    autoComplete="off"
                    enterKeyHint="next"
                    className={fieldSurface}
                  />
                </div>

                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="blurb"
                    icon={<TextAlignLeft weight="bold" className="size-3.5" />}
                    hint={`${oneLiner.length}/${MAX_DESCRIPTION_CHARS}`}
                  >
                    Short description
                  </FieldLabel>
                  <Textarea
                    id="blurb"
                    value={oneLiner}
                    onChange={(e) => onOneLinerChange(e.target.value)}
                    maxLength={MAX_DESCRIPTION_CHARS}
                    placeholder="Launch checklists that actually get checked."
                    className={textareaSurface}
                  />
                  {oneLiner.length >= MAX_DESCRIPTION_CHARS ? (
                    <p className="text-[11px] font-medium text-neutral-500">
                      Maximum {MAX_DESCRIPTION_CHARS} characters.
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="url"
                    icon={<LinkSimple weight="bold" className="size-3.5" />}
                  >
                    Link
                  </FieldLabel>
                  <InputGroup
                    className={cn(
                      fieldSurface,
                      "px-0 has-[[data-slot=input-group-control]:focus-visible]:border-black/15 has-[[data-slot=input-group-control]:focus-visible]:bg-white"
                    )}
                  >
                    <InputGroupAddon
                      align="inline-start"
                      className="pl-4 text-[15px] text-neutral-400"
                    >
                      <InputGroupText className="text-[15px] text-neutral-400">
                        https://
                      </InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                      id="url"
                      value={url}
                      onChange={(e) => onUrlChange(e.target.value)}
                      placeholder="yourproduct.dev"
                      inputMode="url"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="h-full border-0 bg-transparent px-0 text-base tracking-[-0.01em] text-neutral-900 placeholder:text-neutral-400 focus-visible:ring-0 sm:text-[15px]"
                    />
                  </InputGroup>
                  {url.trim() && !isValidStickerUrl(url) ? (
                    <p className="text-[12px] font-medium text-red-600">
                      Enter a valid website (e.g. yoursite.com).
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <FieldLabel
                    htmlFor="category"
                    icon={<FolderSimple weight="bold" className="size-3.5" />}
                  >
                    Category
                  </FieldLabel>
                  <Select
                    value={category}
                    onValueChange={(value) => {
                      if (value) setCategory(value as Category)
                    }}
                  >
                    <SelectTrigger
                      id="category"
                      className={cn(
                        fieldSurface,
                        "w-full justify-between px-4 font-normal"
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      align="start"
                      className="rounded-xl border border-black/[0.06] bg-white shadow-[0_16px_40px_-16px_rgba(0,0,0,0.25)]"
                    >
                      {CATEGORIES.map((c) => (
                        <SelectItem
                          key={c}
                          value={c}
                          className="rounded-lg text-[15px]"
                        >
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </section>

              <button
                type="button"
                className="nk-btn mt-1 w-full"
                disabled={!canContinue}
                onClick={goPay}
              >
                Continue to pay
                {price != null ? ` · $${price}` : ""}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-neutral-900 sm:text-[32px]">
                  Pay ${price}
                </h2>
                <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">
                  You&apos;re buying a{" "}
                  <strong>
                    {plotValid ? formatPlot(unitsW!, unitsH!) : "—"}
                  </strong>{" "}
                  plot — ${price} for {plotValid ? unitsW! * unitsH! : 0} units
                  of wall. After pay, your sticker stays where you pinned it.
                  Mock payment for this prototype.
                </p>
              </div>

              <div className="w-full rounded-[22px] bg-[#f5f5f7] p-4 text-[14px]">
                <div className="flex items-center justify-between text-neutral-600">
                  <span className="flex min-w-0 items-center gap-2 truncate pr-3">
                    <StickerIcon
                      weight="fill"
                      className="size-4 shrink-0 text-neutral-400"
                    />
                    <span className="truncate">{name || "Your sticker"}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 tabular-nums">
                    <GridFour weight="bold" className="size-3.5" />
                    {plotValid ? formatPlot(unitsW!, unitsH!) : "—"}
                  </span>
                </div>
                <div className="mt-3 flex justify-between text-[22px] font-semibold tracking-[-0.02em] text-neutral-900">
                  <span>Total</span>
                  <span className="tabular-nums">${price}</span>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2.5 sm:flex-row">
                <button
                  type="button"
                  className="nk-btn flex-1"
                  disabled={paying || saving}
                  onClick={mockPay}
                >
                  <CreditCard weight="bold" className="size-4" />
                  {paying || saving
                    ? saving
                      ? "Saving…"
                      : "Processing…"
                    : `Pay $${price}`}
                </button>
                <button
                  type="button"
                  className="nk-btn-secondary"
                  disabled={paying || saving}
                  onClick={() => setStep("details")}
                >
                  Back
                </button>
              </div>
              {saveError ? (
                <p
                  role="alert"
                  className="text-[13px] font-medium text-red-600"
                >
                  {saveError}
                </p>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </PlaceShell>
  )
}
