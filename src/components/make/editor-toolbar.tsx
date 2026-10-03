import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import {
  Check,
  CircleDashed,
  DownloadSimple,
  PaintBrush,
  Palette,
  Plus,
  PushPin,
  Ruler,
  SlidersHorizontal,
} from "@phosphor-icons/react"
import type { StickerFilter, StickerStyle } from "@/domain/types"
import { mmToPx, STICKER_FILTERS, STICKER_STYLES } from "@/domain/types"
import {
  SIZE_DEFAULT_MM,
  SIZE_MAX_MM,
  SIZE_MIN_MM,
} from "@/lib/sticker-process"
import { cn } from "@/lib/utils"

export type EditorTab = "style" | "outline" | "filter" | "size"

const EASE_OUT = [0.23, 1, 0.32, 1] as const
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const

const TABS: {
  id: EditorTab
  label: string
  Icon: typeof PaintBrush
}[] = [
  { id: "style", label: "Style", Icon: PaintBrush },
  { id: "outline", label: "Outline", Icon: CircleDashed },
  { id: "filter", label: "Filter", Icon: Palette },
  { id: "size", label: "Size", Icon: Ruler },
]

const STYLE_LABELS: Record<StickerStyle, string> = {
  none: "None",
  classic: "Classic",
  square: "Square",
  rounded: "Rounded",
  circle: "Circle",
  stamp: "Stamp",
  rough: "Rough Cut",
}

const FILTER_LABELS: Record<StickerFilter, string> = {
  original: "Original",
  glitter: "Glitter",
  hologram: "Hologram",
  aurora: "Aurora",
  sunset: "Sunset",
  ocean: "Ocean",
  glow: "Glow",
  vivid: "Vivid",
  warm: "Warm",
  cool: "Cool",
  mono: "Mono",
  noir: "Noir",
  red: "Red",
  blue: "Blue",
  green: "Green",
  yellow: "Yellow",
}

/** CSS approximations of the canvas filters, used only for thumbnails. */
const FILTER_PREVIEW_CSS: Record<StickerFilter, string> = {
  original: "none",
  glitter: "saturate(1.25) brightness(1.04)",
  hologram: "saturate(1.3) brightness(1.05) contrast(1.04)",
  aurora: "saturate(1.2) hue-rotate(40deg) brightness(1.05)",
  sunset: "saturate(1.25) hue-rotate(-25deg) brightness(1.04)",
  ocean: "saturate(1.15) hue-rotate(160deg) brightness(0.98)",
  glow: "contrast(1.12) brightness(1.08)",
  vivid: "saturate(1.5) contrast(1.08)",
  warm: "sepia(0.22) saturate(1.2) hue-rotate(-8deg)",
  cool: "saturate(1.05) hue-rotate(14deg) brightness(1.03)",
  mono: "grayscale(1)",
  noir: "grayscale(1) contrast(1.55)",
  red: "grayscale(1) sepia(1) hue-rotate(-50deg) saturate(6) brightness(0.95)",
  blue: "grayscale(1) sepia(1) hue-rotate(180deg) saturate(6) brightness(0.9)",
  green: "grayscale(1) sepia(1) hue-rotate(70deg) saturate(5) brightness(0.95)",
  yellow: "grayscale(1) sepia(1) hue-rotate(5deg) saturate(8) brightness(1.05)",
}

const GRADATION_OVERLAY: Partial<Record<StickerFilter, string>> = {
  glitter:
    "linear-gradient(120deg, rgba(255,110,220,0.8), rgba(110,220,255,0.8), rgba(255,245,140,0.75))",
  hologram:
    "linear-gradient(120deg, rgba(255,110,220,0.75), rgba(110,220,255,0.75), rgba(255,245,140,0.7))",
  aurora:
    "linear-gradient(125deg, rgba(120,255,210,0.75), rgba(110,180,255,0.8), rgba(200,120,255,0.75))",
  sunset:
    "linear-gradient(125deg, rgba(255,140,60,0.8), rgba(255,90,140,0.75), rgba(180,80,220,0.7))",
  ocean:
    "linear-gradient(125deg, rgba(20,90,140,0.75), rgba(40,180,190,0.8), rgba(80,140,220,0.7))",
}

export const OUTLINE_COLORS = [
  "#FFFFFF",
  "#1C1C1E",
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#0A84FF",
  "#AF52DE",
  "#FF2D55",
]

type Props = {
  tab: EditorTab
  onTabChange: (tab: EditorTab) => void
  disabled: boolean
  style: StickerStyle
  onStyleChange: (s: StickerStyle) => void
  styleThumbs: Partial<Record<StickerStyle, string>>
  filter: StickerFilter
  onFilterChange: (f: StickerFilter) => void
  filterThumb: string | null
  outlineColor: string
  onOutlineColorChange: (c: string) => void
  thickness: number
  onThicknessChange: (n: number) => void
  sizeMm: number
  onSizeMmChange: (n: number) => void
  sourceMaxSide: number | null
  actionsOpen: boolean
  onActionsOpenChange: (open: boolean) => void
  onDownload: () => void
  onPlace: () => void
  onNewSticker: () => void
  placeLabel: string
  exporting: boolean
}

export function EditorToolbar(props: Props) {
  const {
    tab,
    onTabChange,
    disabled,
    actionsOpen,
    onActionsOpenChange,
    onDownload,
    onPlace,
    onNewSticker,
    placeLabel,
    exporting,
  } = props
  const [open, setOpen] = useState(false)
  const actionsRef = useRef<HTMLDivElement>(null)
  // Keep panel closed while disabled without syncing state in an effect.
  const panelOpen = open && !disabled

  // Dismiss on outside press or Escape. A fixed-position overlay cannot work
  // here: the toolbar root's backdrop-filter makes it the containing block.
  useEffect(() => {
    if (!actionsOpen) return
    function onPointerDown(e: PointerEvent) {
      if (actionsRef.current?.contains(e.target as Node)) return
      onActionsOpenChange(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return
      onActionsOpenChange(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [actionsOpen, onActionsOpenChange])

  function selectTab(id: EditorTab) {
    if (panelOpen && tab === id) {
      setOpen(false)
      return
    }
    onTabChange(id)
    setOpen(true)
  }

  return (
    <motion.div
      layout
      className={cn(
        "pointer-events-auto mx-auto w-full max-w-lg rounded-[11px] border border-black/[0.06] bg-white/80 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18),0_2px_6px_-2px_rgba(0,0,0,0.06)] backdrop-blur-2xl backdrop-saturate-150",
        disabled && "pointer-events-none opacity-40"
      )}
      style={{
        transitionProperty: "opacity",
        transitionDuration: "200ms",
        transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
      }}
      transition={{ layout: { duration: 0.28, ease: EASE_IN_OUT } }}
      aria-disabled={disabled}
    >
      <motion.div
        layout
        initial={false}
        animate={{ height: panelOpen ? "auto" : 0, opacity: panelOpen ? 1 : 0 }}
        transition={{
          height: { duration: 0.28, ease: EASE_IN_OUT },
          opacity: { duration: 0.18, ease: EASE_OUT },
        }}
        className="overflow-hidden rounded-t-[11px]"
      >
        <div className="relative h-[132px]">
          <AnimatePresence mode="popLayout" initial={false}>
            {panelOpen ? (
              <motion.div
                key={tab}
                className="absolute inset-0"
                initial={{
                  opacity: 0,
                  transform: "translateY(6px)",
                  filter: "blur(2px)",
                }}
                animate={{
                  opacity: 1,
                  transform: "translateY(0px)",
                  filter: "blur(0px)",
                }}
                exit={{
                  opacity: 0,
                  transform: "translateY(-4px)",
                  filter: "blur(2px)",
                }}
                transition={{ duration: 0.18, ease: EASE_OUT }}
              >
                {tab === "style" ? <StylePanel {...props} /> : null}
                {tab === "outline" ? <OutlinePanel {...props} /> : null}
                {tab === "filter" ? <FilterPanel {...props} /> : null}
                {tab === "size" ? <SizePanel {...props} /> : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="flex items-stretch gap-1.5 px-2 py-1.5">
        <div
          role="tablist"
          className="grid min-w-0 flex-1 grid-cols-4 gap-0.5 rounded-[14px] bg-black/[0.04] p-0.5"
        >
          {TABS.map((t) => {
            const active = panelOpen && t.id === tab
            const Icon = t.Icon
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={active}
                aria-expanded={active}
                onClick={() => selectTab(t.id)}
                className={cn(
                  "press relative flex h-11 w-full flex-col items-center justify-center gap-0.5 rounded-[11px] transition-[color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
                  active ? "text-neutral-900" : "text-neutral-500"
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="editor-tab-pill"
                    className="absolute inset-0 rounded-[11px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_0_0_0.5px_rgba(0,0,0,0.04)]"
                    transition={{
                      type: "spring",
                      duration: 0.32,
                      bounce: 0.12,
                    }}
                  />
                ) : null}
                <Icon
                  weight={active ? "fill" : "regular"}
                  className="relative size-[17px]"
                />
                <span className="relative text-[9px] font-semibold tracking-[-0.01em]">
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>

        <div ref={actionsRef} className="relative shrink-0 self-stretch">
          <button
            type="button"
            aria-label="Download menu"
            aria-haspopup="menu"
            aria-expanded={actionsOpen}
            disabled={disabled || exporting}
            onClick={() => onActionsOpenChange(!actionsOpen)}
            className="press relative grid h-full min-w-11 place-items-center rounded-[11px] bg-neutral-900 px-3 text-white transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] disabled:opacity-35"
          >
            <DownloadSimple weight="bold" className="size-[18px]" />
          </button>

          <AnimatePresence>
            {actionsOpen ? (
              <motion.div
                role="menu"
                className="absolute right-0 bottom-[calc(100%+10px)] z-40 min-w-[200px] origin-bottom-right overflow-hidden rounded-[18px] border border-black/[0.06] bg-white/95 p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.28),0_2px_8px_-2px_rgba(0,0,0,0.08)] backdrop-blur-xl"
                initial={{
                  opacity: 0,
                  transform: "scale(0.96) translateY(4px)",
                }}
                animate={{
                  opacity: 1,
                  transform: "scale(1) translateY(0px)",
                }}
                exit={{
                  opacity: 0,
                  transform: "scale(0.96) translateY(4px)",
                }}
                transition={{ duration: 0.16, ease: EASE_OUT }}
              >
                <ToolbarAction
                  icon={DownloadSimple}
                  label="Download PNG"
                  onClick={onDownload}
                />
                <ToolbarAction
                  icon={PushPin}
                  label={placeLabel}
                  onClick={onPlace}
                />
                <ToolbarAction
                  icon={Plus}
                  label="New sticker"
                  onClick={onNewSticker}
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  )
}

function ToolbarAction({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof DownloadSimple
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="press flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left text-[14px] font-semibold tracking-[-0.01em] text-neutral-900 transition-colors duration-150 hover:bg-black/[0.045] active:scale-[0.98]"
    >
      <Icon weight="bold" className="size-4 text-neutral-500" />
      {label}
    </button>
  )
}

function StylePanel({ style, onStyleChange, styleThumbs }: Props) {
  return (
    <div className="flex h-full flex-col justify-center px-3 pt-1">
      <div className="no-scrollbar flex items-center gap-2.5 overflow-x-auto px-1">
        {STICKER_STYLES.map((s) => {
          const active = s === style
          const thumb = styleThumbs[s]
          return (
            <button
              key={s}
              type="button"
              onClick={() => onStyleChange(s)}
              aria-pressed={active}
              className="press group flex w-[76px] shrink-0 flex-col items-center gap-1 active:scale-[0.97]"
            >
              <span
                className={cn(
                  "grid size-[58px] place-items-center rounded-[18px] transition-[background-color,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
                  active
                    ? "bg-black/[0.05] shadow-[inset_0_0_0_2px_#1c1c1e]"
                    : "bg-black/[0.03]"
                )}
              >
                {s === "none" ? (
                  <SlidersHorizontal
                    weight="bold"
                    className="size-5 text-neutral-400"
                  />
                ) : thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="max-h-[44px] max-w-[44px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.14)]"
                  />
                ) : (
                  <span className="size-8 animate-pulse rounded-xl bg-black/[0.06]" />
                )}
              </span>
              <span
                className={cn(
                  "text-[11px] tracking-[-0.01em] transition-colors duration-150",
                  active
                    ? "font-semibold text-neutral-900"
                    : "font-medium text-neutral-500"
                )}
              >
                {STYLE_LABELS[s]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function OutlinePanel({
  style,
  outlineColor,
  onOutlineColorChange,
  thickness,
  onThicknessChange,
}: Props) {
  const isPreset = OUTLINE_COLORS.some(
    (c) => c.toLowerCase() === outlineColor.toLowerCase()
  )
  const sizeLabel =
    style === "stamp" ||
    style === "square" ||
    style === "rounded" ||
    style === "circle"
      ? "Margin"
      : "Thickness"
  const locked = style === "none"

  return (
    <div className="flex h-full flex-col justify-center gap-3.5">
      {locked ? (
        <p className="px-5 text-center text-[12px] font-medium text-neutral-500">
          Choose a style other than None to edit the outline.
        </p>
      ) : (
        <>
          <div className="no-scrollbar flex items-center gap-2.5 overflow-x-auto px-5 py-1">
            {OUTLINE_COLORS.map((c) => {
              const active = c.toLowerCase() === outlineColor.toLowerCase()
              return (
                <Swatch
                  key={c}
                  active={active}
                  label={`Color ${c}`}
                  onClick={() => onOutlineColorChange(c)}
                >
                  <span
                    className="size-full rounded-full shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.14)]"
                    style={{ backgroundColor: c }}
                  />
                </Swatch>
              )
            })}
            <label
              className={cn(
                "press relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-full p-[3px] transition-shadow duration-150 active:scale-[0.97]",
                !isPreset
                  ? "shadow-[0_0_0_2px_#1c1c1e]"
                  : "shadow-[0_0_0_0px_transparent]"
              )}
              aria-label="Custom color"
            >
              <span
                className="grid size-full place-items-center rounded-full"
                style={{
                  background:
                    "conic-gradient(from 180deg, #ff3b30, #ff9500, #ffcc00, #34c759, #5ac8fa, #0a84ff, #af52de, #ff2d55, #ff3b30)",
                }}
              >
                <span
                  className="size-3.5 rounded-full shadow-[0_0_0_2px_white]"
                  style={{ backgroundColor: outlineColor }}
                />
              </span>
              <input
                type="color"
                value={outlineColor}
                onChange={(e) => onOutlineColorChange(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              />
            </label>
          </div>

          <div className="flex items-center gap-3 px-5">
            <span className="w-[68px] text-[12px] font-medium text-neutral-500">
              {sizeLabel}
            </span>
            <SliderPrimitive.Root
              className="flex-1"
              value={thickness}
              min={4}
              max={30}
              step={1}
              onValueChange={(v) =>
                onThicknessChange(Array.isArray(v) ? v[0] : Number(v))
              }
              aria-label={sizeLabel}
            >
              <SliderPrimitive.Control className="flex h-8 w-full touch-none items-center select-none">
                <SliderPrimitive.Track className="relative h-[5px] w-full rounded-full bg-black/[0.08]">
                  <SliderPrimitive.Indicator className="h-full rounded-full bg-neutral-900" />
                  <SliderPrimitive.Thumb className="size-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18),0_0_0_0.5px_rgba(0,0,0,0.08)] transition-transform duration-150 outline-none focus-visible:ring-4 focus-visible:ring-black/10 active:scale-110" />
                </SliderPrimitive.Track>
              </SliderPrimitive.Control>
            </SliderPrimitive.Root>
            <span className="w-7 text-right text-[12px] font-medium text-neutral-900 tabular-nums">
              {thickness}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function Swatch({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "press relative grid size-9 shrink-0 place-items-center rounded-full p-[3px] transition-shadow duration-150 active:scale-[0.97]",
        active ? "shadow-[0_0_0_2px_#1c1c1e]" : "shadow-[0_0_0_0px_transparent]"
      )}
    >
      {children}
    </button>
  )
}

function FilterPanel({ filter, onFilterChange, filterThumb }: Props) {
  return (
    <div className="no-scrollbar flex h-full items-center gap-3 overflow-x-auto px-5">
      {STICKER_FILTERS.map((f) => {
        const active = f === filter
        const overlay = GRADATION_OVERLAY[f]
        return (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            aria-pressed={active}
            className="press flex w-[62px] shrink-0 flex-col items-center gap-1.5 active:scale-[0.97]"
          >
            <span
              className={cn(
                "relative grid size-[62px] place-items-center overflow-hidden rounded-[18px] bg-black/[0.035] transition-shadow duration-150",
                active && "shadow-[inset_0_0_0_2px_#1c1c1e]"
              )}
            >
              {filterThumb ? (
                <span className="relative">
                  <img
                    src={filterThumb}
                    alt=""
                    className="max-h-[46px] max-w-[46px]"
                    style={{ filter: FILTER_PREVIEW_CSS[f] }}
                  />
                  {overlay ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 mix-blend-color-dodge"
                      style={{
                        WebkitMaskImage: `url(${filterThumb})`,
                        maskImage: `url(${filterThumb})`,
                        WebkitMaskSize: "100% 100%",
                        maskSize: "100% 100%",
                        backgroundImage: overlay,
                      }}
                    />
                  ) : null}
                  {f === "glow" ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 mix-blend-soft-light"
                      style={{
                        WebkitMaskImage: `url(${filterThumb})`,
                        maskImage: `url(${filterThumb})`,
                        WebkitMaskSize: "100% 100%",
                        maskSize: "100% 100%",
                        backgroundImage:
                          "radial-gradient(circle at 30% 25%, rgba(255,255,255,0.95), transparent 55%)",
                      }}
                    />
                  ) : null}
                </span>
              ) : (
                <span className="size-9 animate-pulse rounded-lg bg-black/[0.06]" />
              )}
              {active ? (
                <span className="absolute top-1 right-1 grid size-4 place-items-center rounded-full bg-neutral-900 text-white">
                  <Check weight="bold" className="size-2.5" />
                </span>
              ) : null}
            </span>
            <span
              className={cn(
                "text-[11px] tracking-[-0.01em]",
                active
                  ? "font-semibold text-neutral-900"
                  : "font-medium text-neutral-500"
              )}
            >
              {FILTER_LABELS[f]}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function SizePanel({ sizeMm, onSizeMmChange }: Props) {
  const px = Math.round(mmToPx(sizeMm))

  function update(next: number) {
    onSizeMmChange(Math.min(SIZE_MAX_MM, Math.max(SIZE_MIN_MM, next)))
  }

  return (
    <div className="flex h-full flex-col justify-center gap-3 px-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-neutral-500">Print size</p>
          <p className="mt-0.5 text-[22px] font-semibold tracking-[-0.03em] text-neutral-900 tabular-nums">
            {sizeMm < 100 ? sizeMm.toFixed(1) : Math.round(sizeMm)}
            <span className="ml-1 text-[13px] font-medium text-neutral-400">
              mm
            </span>
          </p>
        </div>
        <p className="pb-1 text-right text-[11px] font-medium text-neutral-400 tabular-nums">
          {px} px
          <span className="mx-1 text-neutral-300">·</span>
          300 DPI
        </p>
      </div>

      <SliderPrimitive.Root
        className="w-full"
        value={sizeMm}
        min={SIZE_MIN_MM}
        max={SIZE_MAX_MM}
        step={1}
        onValueChange={(v) => {
          // Live-update preview while dragging — size is CSS-only, so it's cheap.
          update(Array.isArray(v) ? v[0] : Number(v))
        }}
        aria-label="Sticker size in millimetres"
      >
        <SliderPrimitive.Control className="flex h-8 w-full touch-none items-center select-none">
          <SliderPrimitive.Track className="relative h-[5px] w-full rounded-full bg-black/[0.08]">
            <SliderPrimitive.Indicator className="h-full rounded-full bg-neutral-900" />
            <SliderPrimitive.Thumb className="size-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18),0_0_0_0.5px_rgba(0,0,0,0.08)] transition-transform duration-150 outline-none focus-visible:ring-4 focus-visible:ring-black/10 active:scale-110" />
          </SliderPrimitive.Track>
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>

      <div className="flex items-center justify-between text-[11px] font-medium text-neutral-400">
        <span>{SIZE_MIN_MM} mm</span>
        <span>{SIZE_DEFAULT_MM} mm</span>
        <span>{SIZE_MAX_MM} mm</span>
      </div>
    </div>
  )
}
