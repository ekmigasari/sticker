import { AnimatePresence, motion } from "motion/react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { Check } from "@phosphor-icons/react"
import type { StickerFilter, StickerStyle } from "@/domain/types"
import { STICKER_FILTERS, STICKER_STYLES } from "@/domain/types"
import { cn } from "@/lib/utils"

export type EditorTab = "style" | "outline" | "filter"

const TABS: { id: EditorTab; label: string }[] = [
  { id: "style", label: "Style" },
  { id: "outline", label: "Outline" },
  { id: "filter", label: "Filter" },
]

const STYLE_LABELS: Record<StickerStyle, string> = {
  classic: "Classic",
  stamp: "Stamp",
  rough: "Rough Cut",
}

const FILTER_LABELS: Record<StickerFilter, string> = {
  original: "Original",
  glitter: "Glitter",
  vivid: "Vivid",
  warm: "Warm",
  cool: "Cool",
  mono: "Mono",
  noir: "Noir",
}

/** CSS approximations of the canvas filters, used only for thumbnails. */
const FILTER_PREVIEW_CSS: Record<StickerFilter, string> = {
  original: "none",
  glitter: "saturate(1.25) brightness(1.04)",
  vivid: "saturate(1.5) contrast(1.08)",
  warm: "sepia(0.22) saturate(1.2) hue-rotate(-8deg)",
  cool: "saturate(1.05) hue-rotate(14deg) brightness(1.03)",
  mono: "grayscale(1)",
  noir: "grayscale(1) contrast(1.55)",
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
      <div className="relative h-[124px] overflow-hidden">
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
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-2 pb-2">
        <div
          role="tablist"
          className="relative grid grid-cols-3 rounded-[22px] bg-black/[0.045] p-1"
        >
          {TABS.map((t) => {
            const active = t.id === tab
            return (
              <button
                key={t.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => onTabChange(t.id)}
                className={cn(
                  "press relative h-9 rounded-[18px] text-[13px] font-semibold tracking-[-0.01em] transition-colors duration-150",
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
                <span className="relative">{t.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StylePanel({ style, onStyleChange, styleThumbs }: Props) {
  return (
    <div className="flex h-full items-center justify-center gap-3 px-4">
      {STICKER_STYLES.map((s) => {
        const active = s === style
        const thumb = styleThumbs[s]
        return (
          <button
            key={s}
            type="button"
            onClick={() => onStyleChange(s)}
            aria-pressed={active}
            className="press group flex w-[92px] flex-col items-center gap-1.5"
          >
            <span
              className={cn(
                "grid size-[70px] place-items-center rounded-[20px] transition-[background-color,box-shadow] duration-150",
                active
                  ? "bg-black/[0.05] shadow-[inset_0_0_0_2px_#1c1c1e]"
                  : "bg-black/[0.03]"
              )}
            >
              {thumb ? (
                <img
                  src={thumb}
                  alt=""
                  className="max-h-[54px] max-w-[54px] drop-shadow-[0_2px_3px_rgba(0,0,0,0.14)]"
                />
              ) : (
                <span className="size-10 animate-pulse rounded-xl bg-black/[0.06]" />
              )}
            </span>
            <span
              className={cn(
                "text-[12px] tracking-[-0.01em] transition-colors",
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

  return (
    <div className="flex h-full flex-col justify-center gap-3.5">
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
          onValueChange={(v) => onThicknessChange(Array.isArray(v) ? v[0] : Number(v))}
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
