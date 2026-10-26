import { useState } from "react"
import { Minus, Plus } from "@phosphor-icons/react"
import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "@/lib/utils"

export function parseDim(raw: string): number | null {
  if (raw.trim() === "") return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return Math.round(n)
}

export function DimStepper({
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

export function SliderRow({
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
    const snapped = Math.round(n / step) * step
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
