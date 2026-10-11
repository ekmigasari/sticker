import { useEffect, useRef, useState } from "react"
import { useRouter } from "@tanstack/react-router"
import {
  CaretLeft,
  CaretRight,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react"
import { FormSheet } from "@/components/dashboard/form-sheet"
import { BAN_DURATIONS } from "@/lib/admin"
import { cn } from "@/lib/utils"

/** Fixed locale + UTC so server and client render the same string. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function formatDollars(amount: number): string {
  return `$${amount.toLocaleString("en-US")}`
}

/** Runs an admin mutation, then reloads the route data. */
export function useAdminAction() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<unknown>): Promise<boolean> {
    setPending(true)
    setError(null)
    try {
      await action()
      await router.invalidate()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
      return false
    } finally {
      setPending(false)
    }
  }

  return { run, pending, error, clearError: () => setError(null) }
}

const BADGE_TONES = {
  neutral: "bg-black/[0.06] text-neutral-600",
  blue: "bg-[#0071e3]/10 text-[#0071e3]",
  red: "bg-[#ff3b30]/10 text-[#d70015]",
  amber: "bg-[#ff9f0a]/15 text-[#b25000]",
  green: "bg-[#34c759]/15 text-[#248a3d]",
} as const

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof BADGE_TONES
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] shrink-0 items-center rounded-[7px] px-1.5 text-[12px] font-semibold tracking-[-0.01em] whitespace-nowrap",
        BADGE_TONES[tone]
      )}
    >
      {children}
    </span>
  )
}

/** Debounced search field that writes to the URL. */
export function SearchField({
  value,
  placeholder,
  onChange,
}: {
  value: string | undefined
  placeholder: string
  onChange: (q: string | undefined) => void
}) {
  const [query, setQuery] = useState(value ?? "")
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (document.activeElement !== input.current) setQuery(value ?? "")
  }, [value])

  useEffect(() => {
    const next = query.trim()
    if (next === (value ?? "")) return
    const timer = window.setTimeout(() => onChange(next || undefined), 300)
    return () => window.clearTimeout(timer)
  }, [query, value, onChange])

  return (
    <div className="relative min-w-0 flex-1">
      <MagnifyingGlass
        weight="bold"
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-400"
      />
      <input
        ref={input}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="nk-field pr-10! pl-11! [&::-webkit-search-cancel-button]:hidden"
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery("")
            onChange(undefined)
          }}
          aria-label="Clear search"
          className="press absolute top-1/2 right-2.5 grid size-7 -translate-y-1/2 place-items-center rounded-full text-neutral-400 transition-colors hover:bg-black/[0.06] hover:text-neutral-700"
        >
          <X weight="bold" className="size-3.5" />
        </button>
      ) : null}
    </div>
  )
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Filter"
      className="flex h-12 shrink-0 items-center overflow-x-auto rounded-[14px] bg-[#f5f5f7] p-1"
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-full shrink-0 rounded-[10px] px-3.5 text-[13px] font-medium tracking-[-0.01em] transition-colors",
            value === o.id
              ? "bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.1)]"
              : "text-neutral-500 hover:text-neutral-900"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ResultCount({ total, noun }: { total: number; noun: string }) {
  return (
    <p className="text-[13px] font-medium tracking-[-0.01em] text-neutral-500 tabular-nums">
      {total.toLocaleString("en-US")} {total === 1 ? noun : `${noun}s`}
    </p>
  )
}

export function EmptyRows({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <div className="grid size-14 place-items-center rounded-[18px] bg-[#f5f5f7] text-neutral-400">
        <MagnifyingGlass weight="bold" className="size-6" />
      </div>
      <p className="text-[15px] text-neutral-500">{children}</p>
    </div>
  )
}

export function AdminPager({
  page,
  pageCount,
  onPage,
}: {
  page: number
  pageCount: number
  onPage: (page: number) => void
}) {
  if (pageCount <= 1) return null
  const step =
    "press inline-flex h-10 items-center gap-1 rounded-full px-4 text-[14px] font-semibold tracking-[-0.01em] transition-colors disabled:pointer-events-none disabled:text-neutral-300"
  return (
    <nav
      aria-label="Pagination"
      className="mt-2 flex items-center justify-between gap-3 border-t border-black/[0.06] pt-6"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className={cn(
          step,
          "bg-black/[0.05] text-neutral-900 hover:bg-black/[0.09] disabled:bg-transparent"
        )}
      >
        <CaretLeft weight="bold" className="size-3.5" />
        Previous
      </button>
      <p className="text-[13px] text-neutral-500 tabular-nums">
        Page {page} of {pageCount}
      </p>
      <button
        type="button"
        disabled={page >= pageCount}
        onClick={() => onPage(page + 1)}
        className={cn(
          step,
          "bg-neutral-900 text-white hover:opacity-90 disabled:bg-transparent"
        )}
      >
        Next
        <CaretRight weight="bold" className="size-3.5" />
      </button>
    </nav>
  )
}

export function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-neutral-900">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function ErrorText({ error }: { error: string | null }) {
  return error ? (
    <p className="mt-3 text-[13px] font-medium text-[#ff3b30]">{error}</p>
  ) : null
}

function SheetButtons({
  confirmLabel,
  pendingLabel,
  pending,
  destructive,
  onConfirm,
  onCancel,
}: {
  confirmLabel: string
  pendingLabel: string
  pending: boolean
  destructive: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="mt-6 flex gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={onConfirm}
        className={cn(
          "press h-11 flex-1 rounded-full px-5 text-[15px] font-semibold tracking-[-0.01em] text-white transition-opacity hover:opacity-90 disabled:opacity-40",
          destructive ? "bg-[#ff3b30]" : "bg-neutral-900"
        )}
      >
        {pending ? pendingLabel : confirmLabel}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={onCancel}
        className="nk-btn-secondary flex-1"
      >
        Cancel
      </button>
    </div>
  )
}

export type ConfirmRequest = {
  title: string
  body: React.ReactNode
  confirmLabel: string
  pendingLabel: string
  destructive?: boolean
  /** Ask for an optional reason and pass it to `onConfirm`. */
  reasonLabel?: string
  onConfirm: (reason: string) => Promise<unknown>
}

/** One confirm sheet per page; open it by setting a request. */
export function ConfirmSheet({
  request,
  onClose,
}: {
  request: ConfirmRequest | null
  onClose: () => void
}) {
  const { run, pending, error, clearError } = useAdminAction()
  const [reason, setReason] = useState("")
  const [shown, setShown] = useState(request)
  if (request && request !== shown) {
    setShown(request)
    setReason("")
    clearError()
  }

  async function confirm() {
    if (!shown) return
    if (await run(() => shown.onConfirm(reason.trim()))) onClose()
  }

  return (
    <FormSheet
      open={request !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
      title={shown?.title ?? ""}
    >
      <div className="text-[15px] leading-snug text-neutral-600">
        {shown?.body}
      </div>
      {shown?.reasonLabel ? (
        <label className="mt-5 flex flex-col gap-2">
          <span className="nk-label">{shown.reasonLabel}</span>
          <textarea
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional"
            className="nk-textarea"
          />
        </label>
      ) : null}
      <ErrorText error={error} />
      <SheetButtons
        confirmLabel={shown?.confirmLabel ?? "Confirm"}
        pendingLabel={shown?.pendingLabel ?? "Working…"}
        pending={pending}
        destructive={shown?.destructive ?? false}
        onConfirm={() => void confirm()}
        onCancel={onClose}
      />
    </FormSheet>
  )
}

export function BanSheet({
  user,
  onBan,
  onClose,
}: {
  user: { name: string; email: string } | null
  onBan: (input: { reason: string; days: number }) => Promise<unknown>
  onClose: () => void
}) {
  const { run, pending, error, clearError } = useAdminAction()
  const [reason, setReason] = useState("")
  const [days, setDays] = useState<number>(7)
  const [shown, setShown] = useState(user)
  if (user && user !== shown) {
    setShown(user)
    setReason("")
    setDays(7)
    clearError()
  }

  async function ban() {
    if (await run(() => onBan({ reason: reason.trim(), days }))) onClose()
  }

  return (
    <FormSheet
      open={user !== null}
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
      title="Ban User"
    >
      <p className="text-[15px] leading-snug text-neutral-600">
        <span className="font-semibold text-neutral-900">
          {shown?.name || shown?.email}
        </span>{" "}
        is signed out everywhere and can't sign back in. Their stickers leave
        the wall, directory and rankings until the ban ends.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <span className="nk-label">Duration</span>
        <div className="flex flex-wrap gap-1.5">
          {BAN_DURATIONS.map((d) => (
            <button
              key={d.days}
              type="button"
              aria-pressed={days === d.days}
              onClick={() => setDays(d.days)}
              className={cn(
                "nk-chip",
                days === d.days ? "nk-chip-active" : "nk-chip-idle"
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <label className="mt-5 flex flex-col gap-2">
        <span className="nk-label">Reason (shown to admins)</span>
        <textarea
          value={reason}
          maxLength={300}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Spam, abuse, impersonation…"
          className="nk-textarea"
        />
      </label>
      <ErrorText error={error} />
      <SheetButtons
        confirmLabel="Ban"
        pendingLabel="Banning…"
        pending={pending}
        destructive
        onConfirm={() => void ban()}
        onCancel={onClose}
      />
    </FormSheet>
  )
}
