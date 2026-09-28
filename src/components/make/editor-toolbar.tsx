import { AnimatePresence, motion } from "motion/react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import {
  Check,
  CircleDashed,
  MagicWand,
  PaintBrush,
  Palette,
  Ruler,
  SlidersHorizontal,
  WarningCircle,
} from "@phosphor-icons/react"
import type { StickerFilter, StickerStyle } from "@/domain/types"
import { pxToMm, STICKER_FILTERS, STICKER_STYLES } from "@/domain/types"
import { SIZE_MAX, SIZE_MIN } from "@/lib/sticker-process"
import { cn } from "@/lib/utils"

export type EditorTab = "style" | "outline" | "filter" | "size"

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
  stamp: "Stamp",
  rough: "Rough Cut",
}

const FILTER_LABELS: Record<StickerFilter, string> = {
  original: "Original",
  glitter: "Glitter",
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
  glow: "contrast(1.12) brightness(1.08)",
  vivid: "saturate(1.5) contrast(1.08)",
  warm: "sepia(0.22) saturate(1.2) hue-rotate(-8deg)",
  cool: "saturate(1.05) hue-rotate(14deg) brightness(1.03)",
  mono: "grayscale(1)",
  noir: "grayscale(1) contrast(1.55)",
  red: "grayscale(1) sepia(1) hue-rotate(-50deg) saturate(6) brightness(0.95)",
  blue: "grayscale(1) sepia(1) hue-rotate(180deg) saturate(6) brightness(0.9)",
  green: "grayscale(1) sepia(1) hue-rotate(70deg) saturate(5) brightness(0.95)",
  yellow:
    "grayscale(1) sepia(1) hue-rotate(5deg) saturate(8) brightness(1.05)",
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
  removeBackground: boolean
  onRemoveBackgroundChange: (v: boolean) => void
  sizePx: number
  onSizePxChange: (n: number) => void
  sourceMaxSide: number | null
}

export function EditorToolbar(props: Props) {
  const { tab, onTabChange, disabled } = props
  return (
    <div
      className={cn(
        "pointer-events-auto mx-auto w-full max-w-lg rounded-[30px] border border-black/[0.06] bg-white/80 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18),0_2px_6px_-2px_rgba(0,0,0,0.06)] backdrop-blur-2xl backdrop-saturate-150 transition-opacity duration-200",
        disabled && "pointer-events-none opacity-40"
      )}
      aria-disabled={disabled}
    >
      <div className="relative h-[132px] overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={tab}
            className="absolute inset-0"
            initial={{ opacity: 0, transform: "translateY(6px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: 0, transform: "translateY(-4px)" }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            {tab === "style" ? <StylePanel {...props} /> : null}
            {tab === "outline" ? <OutlinePanel {...props} /> : null}
            {tab === "filter" ? <FilterPanel {...props} /> : null}
            {tab === "size" ? <SizePanel {...props} /> : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-2 pb-2">
        <div
          role="tablist"
          className="relative grid grid-cols-4 rounded-[22px] bg-black/[0.045] p-1"
        >
          {TABS.map((t) => {
            const active = t.id === tab
            const Icon = t.Icon
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => onTabChange(t.id)}
                className={cn(
                  "press relative flex h-11 flex-col items-center justify-center gap-0.5 rounded-[18px] transition-colors duration-150",
                  active ? "text-neutral-900" : "text-neutral-500"
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="editor-tab-pill"
                    className="absolute inset-0 rounded-[18px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.04)]"
                    transition={{ type: "spring", duration: 0.32, bounce: 0.12 }}
                  />
                ) : null}
                <Icon
                  weight={active ? "fill" : "bold"}
                  className="relative size-[15px]"
                />
                <span className="relative text-[10px] font-semibold tracking-[-0.01em]">
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StylePanel({
  style,
  onStyleChange,
  styleThumbs,
  removeBackground,
  onRemoveBackgroundChange,
}: Props) {
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-3 pt-1">
      <button
        type="button"
        aria-pressed={removeBackground}
        onClick={() => onRemoveBackgroundChange(!removeBackground)}
        className={cn(
          "press mx-auto flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold tracking-[-0.01em] transition-colors duration-150",
          removeBackground
            ? "bg-neutral-900 text-white"
            : "bg-black/[0.05] text-neutral-700"
        )}
      >
        <MagicWand weight="bold" className="size-3.5" />
        Remove background
      </button>

      <div className="no-scrollbar flex items-center justify-center gap-2.5 overflow-x-auto px-1">
        {STICKER_STYLES.map((s) => {
          const active = s === style
          const thumb = styleThumbs[s]
          return (
            <button
              key={s}
              type="button"
              onClick={() => onStyleChange(s)}
              aria-pressed={active}
              className="press group flex w-[76px] shrink-0 flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "grid size-[58px] place-items-center rounded-[18px] transition-[background-color,box-shadow] duration-150",
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
                  "text-[11px] tracking-[-0.01em] transition-colors",
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
  const sizeLabel = style === "stamp" ? "Margin" : "Thickness"
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
                "press relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-full p-[3px] transition-shadow duration-150",
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
                  <SliderPrimitive.Thumb className="size-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18),0_0_0_0.5px_rgba(0,0,0,0.08)] outline-none transition-transform duration-150 active:scale-110 focus-visible:ring-4 focus-visible:ring-black/10" />
                </SliderPrimitive.Track>
              </SliderPrimitive.Control>
            </SliderPrimitive.Root>
            <span className="w-7 text-right text-[12px] font-medium tabular-nums text-neutral-900">
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
        "press relative grid size-9 shrink-0 place-items-center rounded-full p-[3px] transition-shadow duration-150",
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
        return (
          <button
            key={f}
            type="button"
            onClick={() => onFilterChange(f)}
            aria-pressed={active}
            className="press flex w-[62px] shrink-0 flex-col items-center gap-1.5"
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
                  {f === "glitter" ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 mix-blend-color-dodge"
                      style={{
                        WebkitMaskImage: `url(${filterThumb})`,
                        maskImage: `url(${filterThumb})`,
                        WebkitMaskSize: "100% 100%",
                        maskSize: "100% 100%",
                        backgroundImage:
                          "linear-gradient(120deg, rgba(255,110,220,0.8), rgba(110,220,255,0.8), rgba(255,245,140,0.75))",
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

function SizePanel({ sizePx, onSizePxChange, sourceMaxSide }: Props) {
  const mm = pxToMm(sizePx)
  const upscaling =
    sourceMaxSide != null && sizePx > sourceMaxSide + 0.5

  return (
    <div className="flex h-full flex-col justify-center gap-3 px-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-medium text-neutral-500">
            Sticker size
          </p>
          <p className="mt-0.5 text-[15px] font-semibold tracking-[-0.02em] tabular-nums text-neutral-900">
            {sizePx} px
            <span className="mx-1.5 font-medium text-neutral-300">·</span>
            {mm.toFixed(1)} mm
          </p>
        </div>
        <p className="pb-0.5 text-[11px] font-medium text-neutral-400">
          Preview = download
        </p>
      </div>

      <SliderPrimitive.Root
        className="w-full"
        value={sizePx}
        min={SIZE_MIN}
        max={SIZE_MAX}
        step={8}
        onValueChange={(v) =>
          onSizePxChange(Array.isArray(v) ? v[0] : Number(v))
        }
        aria-label="Sticker size in pixels"
      >
        <SliderPrimitive.Control className="flex h-8 w-full touch-none items-center select-none">
          <SliderPrimitive.Track className="relative h-[5px] w-full rounded-full bg-black/[0.08]">
            <SliderPrimitive.Indicator className="h-full rounded-full bg-neutral-900" />
            <SliderPrimitive.Thumb className="size-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(0,0,0,0.18),0_0_0_0.5px_rgba(0,0,0,0.08)] outline-none transition-transform duration-150 active:scale-110 focus-visible:ring-4 focus-visible:ring-black/10" />
          </SliderPrimitive.Track>
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>

      {upscaling ? (
        <p
          role="status"
          className="flex items-start gap-1.5 text-[11px] font-medium leading-snug text-amber-700"
        >
          <WarningCircle weight="fill" className="mt-px size-3.5 shrink-0" />
          Upscaling past the original {sourceMaxSide} px — edges may look soft.
        </p>
      ) : (
        <p className="text-[11px] font-medium text-neutral-400">
          Print size at 300 DPI. Same pixels on screen and in the PNG.
        </p>
      )}
    </div>
  )
}
