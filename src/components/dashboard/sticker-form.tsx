import { useState } from "react"
import { Plus } from "@phosphor-icons/react"
import {
  CATEGORIES,
  DEFAULT_CATEGORY,
  DETAIL_LIMITS,
  type Category,
} from "@/domain/types"
import { cn } from "@/lib/utils"

export type StickerFormValues = {
  name: string
  oneLiner: string
  url: string
  category: Category
  description?: string
  offer?: string
  offerCode?: string
  offerExpiresOn?: string
}

type Props = {
  initial?: Partial<StickerFormValues>
  submitLabel: string
  onSubmit: (values: StickerFormValues) => Promise<void>
  onCancel?: () => void
}

function AddToggle({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-dashed border-black/[0.14] px-3.5 text-[13px] font-medium tracking-[-0.01em] text-neutral-700 transition-colors hover:border-black/25 hover:bg-black/[0.03] hover:text-neutral-900"
    >
      <Plus weight="bold" className="size-3" />
      {children}
    </button>
  )
}

export function StickerForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [category, setCategory] = useState<Category>(
    initial?.category ?? DEFAULT_CATEGORY
  )
  const [showDescription, setShowDescription] = useState(!!initial?.description)
  const [showPromo, setShowPromo] = useState(
    !!(initial?.offer || initial?.offerCode || initial?.offerExpiresOn)
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const text = (key: string) =>
      String(form.get(key) ?? "").trim() || undefined
    const values: StickerFormValues = {
      name: String(form.get("name") ?? ""),
      oneLiner: String(form.get("oneLiner") ?? ""),
      url: String(form.get("url") ?? ""),
      category,
      description: showDescription ? text("description") : undefined,
      offer: showPromo ? text("offer") : undefined,
      offerCode: showPromo ? text("offerCode") : undefined,
      offerExpiresOn: showPromo ? text("offerExpiresOn") : undefined,
    }
    try {
      await onSubmit(values)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form
      onSubmit={(e) => void handleSubmit(e)}
      className="flex flex-col gap-5 font-ui"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="nk-label">
          Title
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={DETAIL_LIMITS.name}
          defaultValue={initial?.name}
          placeholder="Parcel Pilot"
          className="nk-field"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="oneLiner" className="nk-label">
          Short description
        </label>
        <textarea
          id="oneLiner"
          name="oneLiner"
          required
          maxLength={DETAIL_LIMITS.oneLiner}
          defaultValue={initial?.oneLiner}
          placeholder="Ship indie launches without the chaos."
          className="nk-textarea"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="url" className="nk-label">
          Link
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          defaultValue={initial?.url}
          placeholder="https://example.com"
          className="nk-field"
        />
      </div>
      <div className="flex flex-col gap-2">
        <span className="nk-label">Category</span>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "nk-chip",
                category === c ? "nk-chip-active" : "nk-chip-idle"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      {showDescription ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="description" className="nk-label">
              Long description
            </label>
            <button
              type="button"
              className="text-[12px] font-medium text-neutral-500 hover:text-neutral-900"
              onClick={() => setShowDescription(false)}
            >
              Remove
            </button>
          </div>
          <textarea
            id="description"
            name="description"
            maxLength={DETAIL_LIMITS.description}
            defaultValue={initial?.description}
            placeholder="What it does, who it's for, and why you built it."
            className="nk-textarea min-h-36"
          />
        </div>
      ) : null}
      {showPromo ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="offer" className="nk-label">
              Promo
            </label>
            <button
              type="button"
              className="text-[12px] font-medium text-neutral-500 hover:text-neutral-900"
              onClick={() => setShowPromo(false)}
            >
              Remove
            </button>
          </div>
          <input
            id="offer"
            name="offer"
            required
            maxLength={DETAIL_LIMITS.offer}
            defaultValue={initial?.offer}
            placeholder="20% off your first year"
            className="nk-field"
          />
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="offerCode"
                className="text-[12px] text-neutral-500"
              >
                Code <span className="text-neutral-400">· optional</span>
              </label>
              <input
                id="offerCode"
                name="offerCode"
                maxLength={DETAIL_LIMITS.offerCode}
                pattern="\S*"
                title="No spaces"
                defaultValue={initial?.offerCode}
                placeholder="LAUNCH20"
                autoComplete="off"
                className="nk-field font-mono tracking-wide"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="offerExpiresOn"
                className="text-[12px] text-neutral-500"
              >
                Ends on <span className="text-neutral-400">· optional</span>
              </label>
              <input
                id="offerExpiresOn"
                name="offerExpiresOn"
                type="date"
                defaultValue={initial?.offerExpiresOn}
                className="nk-field"
              />
            </div>
          </div>
        </div>
      ) : null}
      {!showDescription || !showPromo ? (
        <div className="flex flex-wrap gap-2">
          {!showDescription ? (
            <AddToggle onClick={() => setShowDescription(true)}>
              Long description
            </AddToggle>
          ) : null}
          {!showPromo ? (
            <AddToggle onClick={() => setShowPromo(true)}>Promo</AddToggle>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className="text-[14px] font-medium text-red-600">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-3 pt-1">
        <button type="submit" disabled={pending} className="nk-btn">
          {pending ? "Saving…" : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            className="nk-btn-secondary"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  )
}
