import { useState } from "react"
import { CATEGORIES, type Category } from "@/domain/types"
import { cn } from "@/lib/utils"

export type ProductFormValues = {
  name: string
  oneLiner: string
  url: string
  category: Category
  offer?: string
}

type Props = {
  initial?: Partial<ProductFormValues>
  submitLabel: string
  onSubmit: (values: ProductFormValues) => Promise<void>
  onCancel?: () => void
}

export function ProductForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [category, setCategory] = useState<Category>(
    initial?.category ?? "Tool"
  )

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const values: ProductFormValues = {
      name: String(form.get("name") ?? ""),
      oneLiner: String(form.get("oneLiner") ?? ""),
      url: String(form.get("url") ?? ""),
      category,
      offer: String(form.get("offer") ?? "") || undefined,
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
      className="font-ui flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="nk-label">
          Title
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={80}
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
          maxLength={160}
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
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
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
        <input type="hidden" name="category" value={category} />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="offer" className="nk-label">
          Offer / launch line{" "}
          <span className="text-neutral-400">(optional)</span>
        </label>
        <input
          id="offer"
          name="offer"
          maxLength={120}
          defaultValue={initial?.offer}
          placeholder="Launch week: 30% off"
          className="nk-field"
        />
      </div>
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
