import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import {
  ArrowsHorizontal,
  ArrowsVertical,
  CaretDown,
  CaretLeft,
  CheckCircle,
  CreditCard,
  FolderSimple,
  GridFour,
  LinkSimple,
  LockSimple,
  LockSimpleOpen,
  Plus,
  PushPin,
  Sticker as StickerIcon,
  Tag,
  TextAlignLeft,
  WarningCircle,
} from "@phosphor-icons/react"
import {
  CATEGORIES,
  PLOT_MAX,
  PLOT_MIN,
  PLOT_PRESETS,
  type Category,
  fieldWarning,
  formatPlot,
  plotPrice,
  plotSideBounds,
  unitsToPx,
  validatePlot,
} from "@/domain/types"
import { cn } from "@/lib/utils"
import { publishPlaceListing } from "@/lib/place-publish"
import { isValidStickerUrl } from "@/lib/sticker-meta"
import { useWallStore } from "@/store/wall-store"
import { StickerWall } from "@/components/wall/sticker-wall"

type Step = "details" | "pay" | "place" | "done"

const EASE_OUT = "var(--ease-out)"

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
    <div className="font-ui relative flex h-[100dvh] flex-col overflow-hidden bg-white text-neutral-900 antialiased">
      <header className="relative z-20 flex h-14 shrink-0 items-center justify-between px-3 pt-[env(safe-area-inset-top)] sm:px-5">
        {onBack ? (
          <button
            type="button"
            aria-label={backLabel ?? "Back"}
            onClick={onBack}
            className="press grid size-10 place-items-center rounded-full bg-black/[0.045] text-neutral-900 hover:bg-black/[0.07]"
          >
            <CaretLeft weight="bold" className="size-[18px]" />
          </button>
        ) : backTo ? (
          <Link
            to={backTo}
            aria-label={backLabel ?? "Back"}
            className="press grid size-10 place-items-center rounded-full bg-black/[0.045] text-neutral-900 hover:bg-black/[0.07]"
          >
            <CaretLeft weight="bold" className="size-[18px]" />
          </Link>
        ) : (
          <span className="size-10" />
        )}
        <h1 className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[15px] font-semibold tracking-[-0.01em]">
          {title}
        </h1>
        <div className="flex min-w-10 items-center justify-end gap-2">
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
}: {
  src: string
  w: number | null
  h: number | null
  valid: boolean
  compact?: boolean
}) {
  const stage = compact ? 180 : 300
  const unitsW = w ?? 5
  const unitsH = h ?? 5
  const box = plotBoxSize(unitsW, unitsH, stage)

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        compact ? "py-3" : "py-4"
      )}
    >
      <div className="flex items-center gap-2">
        {valid ? (
          <div className="flex w-6 shrink-0 flex-col items-center justify-center gap-0.5 text-neutral-400">
            <ArrowsVertical weight="bold" className="size-3" />
            <span className="text-[11px] font-semibold tabular-nums tracking-[-0.02em]">
              {unitsH}
            </span>
          </div>
        ) : (
          <span className="w-6 shrink-0" />
        )}

        <div className="flex flex-col items-center gap-1.5">
          <div
            className={cn(
              "relative overflow-hidden motion-reduce:transition-none",
              !valid && "opacity-45"
            )}
            style={{
              width: box.width,
              height: box.height,
              transition: `width 220ms ${EASE_OUT}, height 220ms ${EASE_OUT}`,
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
            <div className="flex items-center gap-1 text-neutral-400">
              <ArrowsHorizontal weight="bold" className="size-3" />
              <span className="text-[11px] font-semibold tabular-nums tracking-[-0.02em]">
                {unitsW}
              </span>
            </div>
          ) : (
            <span className="h-[18px]" />
          )}
        </div>

        <span className="w-6 shrink-0" />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium tracking-[-0.01em] text-neutral-500">
        <GridFour weight="bold" className="size-3.5 text-neutral-400" />
        {valid
          ? `${formatPlot(unitsW, unitsH)} · ${unitsW * unitsH} units`
          : "Enter a valid plot size"}
      </p>
    </div>
  )
}

function PresetGlyph({
  w,
  h,
  active,
}: {
  w: number
  h: number
  active: boolean
}) {
  const max = Math.max(w, h)
  return (
    <span
      aria-hidden
      className={cn(
        "block rounded-[2px] ring-1",
        active ? "bg-white/25 ring-white/40" : "bg-neutral-900/10 ring-black/10"
      )}
      style={{
        width: Math.max(10, (w / max) * 22),
        height: Math.max(10, (h / max) * 22),
      }}
    />
  )
}

function LimitBanner() {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {[
        { label: "Min", value: `${PLOT_MIN} units` },
        { label: "Max", value: `${PLOT_MAX} units` },
        { label: "Ratio", value: "16:9" },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded-xl bg-black/[0.04] px-2.5 py-2 text-center"
        >
          <p className="text-[10px] font-semibold tracking-[0.04em] text-neutral-400 uppercase">
            {item.label}
          </p>
          <p className="mt-0.5 text-[13px] font-semibold tracking-[-0.02em] text-neutral-900">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  )
}

export function PlaceFlow() {
  const navigate = useNavigate()
  const draftSticker = useWallStore((s) => s.draftSticker)
  const placeDraft = useWallStore((s) => s.placeDraft)
  const setDraftSticker = useWallStore((s) => s.setDraftSticker)
  const setPlaceDraft = useWallStore((s) => s.setPlaceDraft)
  const confirmPlacement = useWallStore((s) => s.confirmPlacement)
  const hydrate = useWallStore((s) => s.hydrate)

  const [step, setStep] = useState<Step>("details")
  const [widthRaw, setWidthRaw] = useState("5")
  const [heightRaw, setHeightRaw] = useState("5")
  const [ratioLocked, setRatioLocked] = useState(true)
  const lockedAspectRef = useRef(1)
  const [name, setName] = useState("")
  const [oneLiner, setOneLiner] = useState("")
  const [url, setUrl] = useState("")
  const [category, setCategory] = useState<Category>("Developer Tools")
  const [paying, setPaying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const unitsW = parseDim(widthRaw)
  const unitsH = parseDim(heightRaw)
  const plotCheck =
    unitsW != null && unitsH != null
      ? validatePlot(unitsW, unitsH)
      : { ok: false as const, reason: "Enter width and height." }
  const price =
    plotCheck.ok && unitsW != null && unitsH != null
      ? plotPrice(unitsW, unitsH)
      : null

  const widthWarn = fieldWarning(unitsW, unitsH, "width")
  const heightWarn = fieldWarning(unitsH, unitsW, "height")

  const activePresetId = useMemo(() => {
    if (unitsW == null || unitsH == null) return null
    return (
      PLOT_PRESETS.find((p) => p.w === unitsW && p.h === unitsH)?.id ?? null
    )
  }, [unitsW, unitsH])
  const isCustom = unitsW != null && unitsH != null && activePresetId == null

  const canContinue = useMemo(
    () =>
      plotCheck.ok &&
      name.trim().length > 1 &&
      oneLiner.trim().length > 3 &&
      isValidStickerUrl(url),
    [plotCheck.ok, name, oneLiner, url]
  )

  function syncLockedAspect(w: number, h: number) {
    if (h > 0) lockedAspectRef.current = w / h
  }

  function applyPreset(w: number, h: number) {
    setWidthRaw(String(w))
    setHeightRaw(String(h))
    syncLockedAspect(w, h)
  }

  function onWidthChange(raw: string) {
    const cleaned = raw.replace(/[^\d]/g, "")
    setWidthRaw(cleaned)
    const w = parseDim(cleaned)
    if (w == null || !ratioLocked) return
    const nextH = clampSide(Math.round(w / lockedAspectRef.current), w)
    setHeightRaw(String(nextH))
  }

  function onHeightChange(raw: string) {
    const cleaned = raw.replace(/[^\d]/g, "")
    setHeightRaw(cleaned)
    const h = parseDim(cleaned)
    if (h == null || !ratioLocked) return
    const nextW = clampSide(Math.round(h * lockedAspectRef.current), h)
    setWidthRaw(String(nextW))
  }

  function toggleRatioLock() {
    if (!ratioLocked && unitsW != null && unitsH != null && unitsH > 0) {
      syncLockedAspect(unitsW, unitsH)
    }
    setRatioLocked((v) => !v)
  }

  function goPay() {
    if (!draftSticker || !plotCheck.ok || unitsW == null || unitsH == null) {
      return
    }
    setPlaceDraft({
      sticker: draftSticker,
      unitsW,
      unitsH,
      details: {
        name: name.trim(),
        oneLiner: oneLiner.trim(),
        url: url.trim(),
        category,
      },
    })
    setStep("pay")
  }

  function mockPay() {
    setPaying(true)
    window.setTimeout(() => {
      setPaying(false)
      setStep("place")
    }, 900)
  }

  async function onPlace(x: number, y: number) {
    if (!draftSticker || saving) return
    const draft = useWallStore.getState().placeDraft
    if (!draft) return

    setSaving(true)
    setSaveError(null)
    try {
      const published = await publishPlaceListing({
        details: draft.details,
        sticker: draft.sticker,
      })
      const placement = confirmPlacement(x, y, {
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
    }
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
            Your placement is permanent. Newer stickers can cover it — that&apos;s
            the game. Your sticker is in the directory either way.
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
    const placeW = placeDraft?.unitsW ?? unitsW
    const placeH = placeDraft?.unitsH ?? unitsH
    if (placeW == null || placeH == null || !validatePlot(placeW, placeH).ok) {
      return (
        <PlaceShell title="Place" backTo="/make" backLabel="Back to make">
          <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 text-center">
            <IconWell>
              <GridFour weight="bold" className="size-7" />
            </IconWell>
            <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-neutral-900">
              Resume details
            </h2>
            <p className="max-w-xs text-[15px] leading-relaxed text-neutral-500">
              Plot size is missing. Go back and set width and height.
            </p>
            <button
              type="button"
              className="press inline-flex h-11 items-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white"
              onClick={() => setStep("details")}
            >
              Edit details
            </button>
          </main>
        </PlaceShell>
      )
    }
    const placePrice = plotPrice(placeW, placeH)

    return (
      <div className="font-ui relative">
        <div className="pointer-events-none absolute top-3 right-3 left-3 z-30 flex justify-center pt-[env(safe-area-inset-top)] sm:top-4">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-black/[0.06] bg-white/85 py-2.5 pr-5 pl-2.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
            <span className="grid size-9 place-items-center rounded-full bg-neutral-900 text-white">
              <PushPin weight="fill" className="size-4" />
            </span>
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.01em] text-neutral-900">
                {saving
                  ? "Saving your sticker…"
                  : `Tap to place ${formatPlot(placeW, placeH)}`}
              </p>
              <p className="text-[12px] text-neutral-500">
                ${placePrice} paid · prototype
              </p>
            </div>
          </div>
        </div>
        {saveError ? (
          <p
            role="alert"
            className="pointer-events-none absolute top-[4.75rem] right-4 left-4 z-30 text-center text-[12px] font-medium text-red-600"
          >
            {saveError}
          </p>
        ) : null}
        <StickerWall
          placeMode={!saving}
          ghostW={unitsToPx(placeW)}
          ghostH={unitsToPx(placeH)}
          onPlace={(x, y) => void onPlace(x, y)}
        />
        <img
          src={draftSticker.imageDataUrl}
          alt=""
          className="pointer-events-none fixed right-4 bottom-4 z-30 size-16 object-contain opacity-90 drop-shadow-lg sm:size-20"
        />
      </div>
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
      backTo={step === "details" ? "/make" : undefined}
      onBack={step === "pay" ? () => setStep("details") : undefined}
      backLabel={step === "pay" ? "Back to details" : "Back to make"}
      trailing={
        step === "details" && price != null ? (
          <span className="rounded-full bg-black/[0.045] px-3 py-1.5 text-[13px] font-semibold tabular-nums tracking-[-0.01em] text-neutral-800">
            ${price}
          </span>
        ) : null
      }
    >
      <main className="relative min-h-0 flex-1 overflow-auto overscroll-contain">
        <div className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-[max(28px,env(safe-area-inset-bottom))] pt-1 sm:px-6">
          <PlotPreview
            src={draftSticker.imageDataUrl}
            w={unitsW}
            h={unitsH}
            valid={plotCheck.ok}
            compact={step === "pay"}
          />

          {step === "details" ? (
            <div className="flex flex-col gap-6">
              <section className="space-y-3">
                <FieldLabel
                  icon={<GridFour weight="bold" className="size-3.5" />}
                >
                  Aspect
                </FieldLabel>

                <LimitBanner />

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {PLOT_PRESETS.map((preset) => {
                    const active = activePresetId === preset.id
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.w, preset.h)}
                        className={cn(
                          "press flex flex-col items-start gap-2 rounded-xl border px-3 py-3 text-left",
                          active
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-black/[0.08] bg-white text-neutral-900 hover:bg-black/[0.03]"
                        )}
                      >
                        <PresetGlyph
                          w={preset.w}
                          h={preset.h}
                          active={active}
                        />
                        <span>
                          <span className="block text-[13px] font-semibold tracking-[-0.02em]">
                            {preset.label}
                          </span>
                          <span
                            className={cn(
                              "block text-[10px]",
                              active ? "text-white/65" : "text-neutral-500"
                            )}
                          >
                            ${plotPrice(preset.w, preset.h)}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      // Keep current custom values; unlock so user can edit freely.
                      if (activePresetId) {
                        setRatioLocked(false)
                      }
                    }}
                    className={cn(
                      "press flex flex-col items-start gap-2 rounded-xl border px-3 py-3 text-left",
                      isCustom
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-dashed border-black/[0.14] bg-white text-neutral-900 hover:bg-black/[0.03]"
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-[22px] place-items-center rounded-[2px] ring-1",
                        isCustom
                          ? "bg-white/20 ring-white/40 text-white"
                          : "bg-neutral-900/5 ring-black/10 text-neutral-500"
                      )}
                    >
                      <Plus weight="bold" className="size-3" />
                    </span>
                    <span>
                      <span className="block text-[13px] font-semibold tracking-[-0.02em]">
                        Custom
                      </span>
                      <span
                        className={cn(
                          "block text-[10px]",
                          isCustom ? "text-white/65" : "text-neutral-500"
                        )}
                      >
                        Your size
                      </span>
                    </span>
                  </button>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <FieldLabel
                    icon={<ArrowsHorizontal weight="bold" className="size-3.5" />}
                  >
                    Width × Height
                  </FieldLabel>
                  <button
                    type="button"
                    onClick={toggleRatioLock}
                    aria-pressed={ratioLocked}
                    className={cn(
                      "press inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold tracking-[-0.01em]",
                      ratioLocked
                        ? "bg-neutral-900 text-white"
                        : "bg-black/[0.05] text-neutral-600"
                    )}
                  >
                    {ratioLocked ? (
                      <LockSimple weight="bold" className="size-3.5" />
                    ) : (
                      <LockSimpleOpen weight="bold" className="size-3.5" />
                    )}
                    {ratioLocked ? "Ratio locked" : "Ratio free"}
                  </button>
                </div>

                <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="plot-w"
                      className="flex items-center gap-1 text-[12px] font-medium text-neutral-500"
                    >
                      <ArrowsHorizontal weight="bold" className="size-3.5" />
                      Width
                    </label>
                    <input
                      id="plot-w"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={widthRaw}
                      onChange={(e) => onWidthChange(e.target.value)}
                      aria-invalid={Boolean(widthWarn)}
                      className={cn(
                        "nk-field tabular-nums",
                        widthWarn &&
                          "border-red-300 bg-red-50 focus:border-red-400 focus:bg-red-50"
                      )}
                      placeholder="5"
                    />
                    {widthWarn ? (
                      <p className="flex items-start gap-1 text-[11px] font-medium leading-snug text-red-600">
                        <WarningCircle
                          weight="fill"
                          className="mt-px size-3.5 shrink-0"
                        />
                        {widthWarn}
                      </p>
                    ) : (
                      <p className="text-[11px] text-neutral-400">
                        {PLOT_MIN}–{PLOT_MAX}
                        {unitsH != null
                          ? ` · min ${plotSideBounds(unitsH).min}`
                          : ""}
                      </p>
                    )}
                  </div>

                  <div className="flex h-12 items-center self-center pt-5 text-[15px] font-medium text-neutral-300">
                    ×
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="plot-h"
                      className="flex items-center gap-1 text-[12px] font-medium text-neutral-500"
                    >
                      <ArrowsVertical weight="bold" className="size-3.5" />
                      Height
                    </label>
                    <input
                      id="plot-h"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={heightRaw}
                      onChange={(e) => onHeightChange(e.target.value)}
                      aria-invalid={Boolean(heightWarn)}
                      className={cn(
                        "nk-field tabular-nums",
                        heightWarn &&
                          "border-red-300 bg-red-50 focus:border-red-400 focus:bg-red-50"
                      )}
                      placeholder="5"
                    />
                    {heightWarn ? (
                      <p className="flex items-start gap-1 text-[11px] font-medium leading-snug text-red-600">
                        <WarningCircle
                          weight="fill"
                          className="mt-px size-3.5 shrink-0"
                        />
                        {heightWarn}
                      </p>
                    ) : (
                      <p className="text-[11px] text-neutral-400">
                        {PLOT_MIN}–{PLOT_MAX}
                        {unitsW != null
                          ? ` · min ${plotSideBounds(unitsW).min}`
                          : ""}
                      </p>
                    )}
                  </div>
                </div>

                {plotCheck.ok ? (
                  <p className="text-[13px] text-neutral-500">
                    Area {unitsW! * unitsH!} ·{" "}
                    <span className="font-semibold text-neutral-900">
                      ${price}
                    </span>
                  </p>
                ) : null}
              </section>

              <section className="space-y-4">
                <FieldLabel
                  htmlFor="name"
                  icon={<Tag weight="bold" className="size-3.5" />}
                >
                  Title
                </FieldLabel>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ShipKit"
                  className="nk-field"
                  autoComplete="off"
                />

                <FieldLabel
                  htmlFor="blurb"
                  icon={<TextAlignLeft weight="bold" className="size-3.5" />}
                >
                  Short description
                </FieldLabel>
                <textarea
                  id="blurb"
                  value={oneLiner}
                  onChange={(e) => setOneLiner(e.target.value)}
                  placeholder="Launch checklists that actually get checked."
                  className="nk-textarea"
                />

                <FieldLabel
                  htmlFor="url"
                  icon={<LinkSimple weight="bold" className="size-3.5" />}
                >
                  Link
                </FieldLabel>
                <input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourproduct.dev"
                  className="nk-field"
                  inputMode="url"
                  autoCapitalize="off"
                  autoCorrect="off"
                />
                {url.trim() && !isValidStickerUrl(url) ? (
                  <p className="text-[12px] font-medium text-red-600">
                    Enter a full website link (e.g. https://yoursite.com).
                  </p>
                ) : null}

                <FieldLabel
                  htmlFor="category"
                  icon={<FolderSimple weight="bold" className="size-3.5" />}
                >
                  Category
                </FieldLabel>
                <div className="relative">
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as Category)}
                    className="nk-field appearance-none pr-10"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <CaretDown
                    weight="bold"
                    className="pointer-events-none absolute top-1/2 right-3.5 size-3.5 -translate-y-1/2 text-neutral-400"
                    aria-hidden
                  />
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
                    {unitsW != null && unitsH != null
                      ? formatPlot(unitsW, unitsH)
                      : "—"}
                  </strong>{" "}
                  plot — ${price} for {unitsW! * unitsH!} units of wall. Mock
                  payment for this prototype.
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
                    {unitsW != null && unitsH != null
                      ? formatPlot(unitsW, unitsH)
                      : "—"}
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
                  disabled={paying}
                  onClick={mockPay}
                >
                  <CreditCard weight="bold" className="size-4" />
                  {paying ? "Processing…" : `Pay $${price}`}
                </button>
                <button
                  type="button"
                  className="nk-btn-secondary"
                  onClick={() => setStep("details")}
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </PlaceShell>
  )
}
