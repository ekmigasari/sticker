import { useState, type CSSProperties, type ReactNode } from "react"
import { CalendarBlank, Plus } from "@phosphor-icons/react"
import { CategoryIcon, categoryAccent } from "@/components/category-icon"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORIES, localIsoDate, type Category } from "@/domain/types"
import { cn } from "@/lib/utils"

/**
 * Apple-surface styling on top of underline-default UI primitives.
 * Text is 16px on mobile on purpose: smaller makes iOS Safari zoom on focus.
 */
export const fieldSurface =
  "h-12 rounded-[14px] border border-black/[0.06] bg-[#f5f5f7] px-4 text-base tracking-[-0.01em] text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-black/15 focus-visible:bg-white focus-visible:ring-0 sm:text-[15px]"

export const textareaSurface =
  "min-h-24 rounded-[14px] border border-black/[0.06] bg-[#f5f5f7] px-4 py-3 text-base tracking-[-0.01em] text-neutral-900 shadow-none placeholder:text-neutral-400 focus-visible:border-black/15 focus-visible:bg-white focus-visible:ring-0 sm:text-[15px]"

export function stripUrlProtocol(raw: string) {
  return raw.replace(/^https?:\/\//i, "")
}

export const revealMotion =
  "animate-in fade-in slide-in-from-top-1 duration-200 ease-out motion-reduce:animate-none"

const popupSurface =
  "border border-black/[0.06] bg-white shadow-[0_16px_40px_-16px_rgba(0,0,0,0.25)] ring-0"

export function FieldLabel({
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

export function AddDetailButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-black/[0.14] px-3.5 text-[13px] font-medium tracking-[-0.01em] text-neutral-700 transition-colors hover:border-black/25 hover:bg-black/[0.03] hover:text-neutral-900"
    >
      <Plus weight="bold" className="size-3 text-neutral-400" />
      {children}
    </button>
  )
}

export function RemoveDetailButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="press -my-1 rounded-full px-2 py-1 text-[12px] font-medium text-neutral-500 transition-colors hover:bg-black/[0.045] hover:text-neutral-900"
    >
      Remove
    </button>
  )
}

function CategoryOption({ category }: { category: Category }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <CategoryIcon
        category={category}
        color={categoryAccent(category)}
        className="size-5 shrink-0"
      />
      <span className="truncate text-base font-normal tracking-[-0.01em] text-neutral-900 normal-case sm:text-[15px]">
        {category}
      </span>
    </span>
  )
}

export function CategorySelect({
  id,
  value,
  onChange,
}: {
  id?: string
  value: Category
  onChange: (category: Category) => void
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as Category)
      }}
    >
      <SelectTrigger
        id={id}
        className={cn(fieldSurface, "w-full justify-between px-4")}
      >
        <SelectValue>
          {(selected: Category) => <CategoryOption category={selected} />}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="start"
        className={cn(
          popupSurface,
          "max-h-[min(24rem,var(--available-height))] rounded-[18px] p-1.5"
        )}
      >
        {CATEGORIES.map((c) => (
          <SelectItem
            key={c}
            value={c}
            className="rounded-[12px] py-2.5 pr-9 pl-3 focus:bg-black/[0.045]"
          >
            <CategoryOption category={c} />
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y!, m! - 1, d!)
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

/** `value` and `min` are local `YYYY-MM-DD` strings; "" means no date. */
export function DateField({
  id,
  value,
  onChange,
  min,
  placeholder = "Pick a date",
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  min?: string
  placeholder?: string
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? parseIsoDate(value) : undefined
  const minDate = min ? parseIsoDate(min) : undefined

  function pick(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        render={
          <button
            type="button"
            className={cn(
              fieldSurface,
              "flex w-full items-center justify-between gap-2 text-left outline-none data-popup-open:border-black/15 data-popup-open:bg-white",
              !selected && "text-neutral-400"
            )}
          />
        }
      >
        <span className="truncate">
          {selected ? formatDate(selected) : placeholder}
        </span>
        <CalendarBlank
          weight="bold"
          className="size-4 shrink-0 text-neutral-400"
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(popupSurface, "w-auto gap-0 rounded-[20px] p-2")}
      >
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? minDate}
          disabled={minDate ? { before: minDate } : undefined}
          onSelect={(date) => pick(date ? localIsoDate(date) : "")}
          style={
            {
              "--cell-size": "2.5rem",
              "--cell-radius": "9999px",
            } as CSSProperties
          }
          className={cn(
            "bg-transparent p-1",
            "**:data-[slot=button]:rounded-full **:data-[slot=button]:text-[14px] **:data-[slot=button]:font-medium **:data-[slot=button]:tracking-normal **:data-[slot=button]:normal-case",
            "**:data-[selected-single=true]:bg-neutral-900 **:data-[selected-single=true]:text-white"
          )}
        />
        {selected ? (
          <button
            type="button"
            onClick={() => pick("")}
            className="press mx-1 mt-1 h-10 rounded-[12px] text-[15px] font-medium tracking-[-0.01em] text-[#ff3b30] transition-colors hover:bg-black/[0.04]"
          >
            Clear date
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
