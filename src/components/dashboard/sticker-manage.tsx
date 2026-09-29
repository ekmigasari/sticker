import { Link, useRouter } from "@tanstack/react-router"
import { ArrowLeft, Plus, Trash, ArrowSquareOut } from "@phosphor-icons/react"
import type { StickerDTO } from "@/lib/sticker-api"
import { useState } from "react"
import { StickerForm, type StickerFormValues } from "./sticker-form"

export function StickerManage({ sticker: initial }: { sticker: StickerDTO }) {
  const router = useRouter()
  const [sticker, setSticker] = useState(initial)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  async function saveDetails(values: StickerFormValues) {
    const response = await fetch(`/api/stickers/${sticker.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    })
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      throw new Error(payload?.error ?? "Could not save.")
    }
    const payload = (await response.json()) as { sticker: StickerDTO }
    setSticker(payload.sticker)
    setEditing(false)
    await router.invalidate()
  }

  async function removeSticker() {
    if (!window.confirm(`Remove “${sticker.name}” from your collection?`)) return
    setBusy(true)
    const response = await fetch(`/api/stickers/${sticker.id}`, {
      method: "DELETE",
    })
    setBusy(false)
    if (!response.ok) {
      window.alert("Could not delete sticker.")
      return
    }
    await router.invalidate()
    await router.navigate({ to: "/dashboard" })
  }

  return (
    <div className="nk-page max-w-2xl">
      <div>
        <Link
          to="/dashboard"
          className="press inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft weight="bold" className="size-3.5" />
          Collection
        </Link>
      </div>

      <div className="mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div className="grid size-44 shrink-0 place-items-center rounded-[28px] border border-black/[0.06] bg-[#f5f5f7] p-4 shadow-[0_12px_28px_-16px_rgba(0,0,0,0.2)] sm:size-52">
          <img
            src={sticker.imageUrl}
            alt=""
            className="max-h-full object-contain drop-shadow-lg"
          />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="nk-label">{sticker.category}</p>
          <h1 className="mt-2 text-[32px] font-semibold tracking-[-0.03em] text-neutral-900 sm:text-[40px]">
            {sticker.name}
          </h1>
          <p className="mt-2 text-[15px] leading-snug text-neutral-500">
            {sticker.oneLiner}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Link
              to="/make"
              search={{ stickerId: sticker.id }}
              className="nk-btn"
            >
              <Plus weight="bold" className="size-4" />
              Replace artwork
            </Link>
            <Link
              to="/sticker/$slug"
              params={{ slug: sticker.slug }}
              className="nk-btn-secondary"
            >
              Public page
              <ArrowSquareOut weight="bold" className="size-4" />
            </Link>
            <button
              type="button"
              className="nk-btn-secondary"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? "Close edit" : "Edit details"}
            </button>
            <button
              type="button"
              className="press inline-flex h-11 items-center gap-1.5 rounded-full bg-red-50 px-5 text-[15px] font-semibold tracking-[-0.01em] text-red-600 disabled:opacity-35"
              disabled={busy}
              onClick={() => void removeSticker()}
            >
              <Trash weight="bold" className="size-4" />
              Remove
            </button>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="mt-8 rounded-[28px] border border-black/[0.06] bg-white p-5 sm:p-7">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-neutral-900">
            Sticker details
          </h2>
          <div className="mt-5">
            <StickerForm
              initial={sticker}
              submitLabel="Save"
              onSubmit={saveDetails}
              onCancel={() => setEditing(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
