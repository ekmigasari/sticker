import { useState } from "react"
import { CATEGORIES, type Category } from "@/domain/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const category = String(form.get("category") ?? "Tool") as Category
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
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Product name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={80}
          defaultValue={initial?.name}
          placeholder="Parcel Pilot"
          className="rounded-xl border border-input bg-card px-3"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="oneLiner">One-liner</Label>
        <Textarea
          id="oneLiner"
          name="oneLiner"
          required
          maxLength={160}
          defaultValue={initial?.oneLiner}
          placeholder="Ship indie launches without the chaos."
          className="min-h-20 rounded-xl border border-input bg-card px-3"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="url">Website URL</Label>
        <Input
          id="url"
          name="url"
          type="url"
          required
          defaultValue={initial?.url}
          placeholder="https://example.com"
          className="rounded-xl border border-input bg-card px-3"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="category">Category</Label>
        <select
          id="category"
          name="category"
          defaultValue={initial?.category ?? "Tool"}
          className="h-10 w-full rounded-xl border border-input bg-card px-3 font-sans text-sm outline-none focus-visible:border-ring"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="offer">Offer / launch line (optional)</Label>
        <Input
          id="offer"
          name="offer"
          maxLength={120}
          defaultValue={initial?.offer}
          placeholder="Launch week: 30% off"
          className="rounded-xl border border-input bg-card px-3"
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending} className="rounded-2xl">
          {pending ? "Saving…" : submitLabel}
        </Button>
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  )
}
