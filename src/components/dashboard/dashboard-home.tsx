import { useState } from "react"
import { Link, useRouter } from "@tanstack/react-router"
import { Plus, PencilSimple, Trash } from "@phosphor-icons/react"
import { motion } from "motion/react"
import type { StickerDTO } from "@/lib/sticker-api"
import { StickerForm, type StickerFormValues } from "./sticker-form"
import { cn } from "@/lib/utils"

async function readError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string
  } | null
  return payload?.error ?? "Request failed."
}

const TILTS = [-3, 2.5, -1.5, 3, -2, 1.5, -2.5, 2]

export function DashboardHome({
  userEmail,
  stickers: initialStickers,
}: {
  userEmail: string
  stickers: StickerDTO[]
}) {
  const router = useRouter()
  const [stickers, setStickers] = useState(initialStickers)
  const [editing, setEditing] = useState<StickerDTO | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function updateSticker(values: StickerFormValues) {
    if (!editing) return
    const response = await fetch(`/api/stickers/${editing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    })
    if (!response.ok) throw new Error(await readError(response))
    const payload = (await response.json()) as { sticker: StickerDTO }
    setStickers((prev) =>
      prev.map((s) => (s.id === payload.sticker.id ? payload.sticker : s))
    )
    setEditing(null)
    await router.invalidate()
  }

  async function deleteSticker(sticker: StickerDTO) {
    if (!window.confirm(`Remove “${sticker.name}” from your collection?`)) {
      return
    }
    setBusyId(sticker.id)
    const response = await fetch(`/api/stickers/${sticker.id}`, {
      method: "DELETE",
    })
    setBusyId(null)
    if (!response.ok) {
      window.alert(await readError(response))
      return
    }
    setStickers((prev) => prev.filter((s) => s.id !== sticker.id))
    await router.invalidate()
  }

  if (editing) {
    return (
      <div className="nk-page max-w-lg">
        <button
          type="button"
          className="press text-[13px] font-medium tracking-[-0.01em] text-neutral-500 hover:text-neutral-900"
          onClick={() => setEditing(null)}
        >
          ← Collection
        </button>
        <h1 className="nk-title mt-4">Edit sticker</h1>
        <p className="nk-subtitle mt-3">
          Update the title, description, link, or category for this sticker.
        </p>
        <div className="mt-8 rounded-[28px] border border-black/[0.06] bg-white p-5 sm:p-7">
          <StickerForm
            initial={editing}
            submitLabel="Save changes"
            onSubmit={updateSticker}
            onCancel={() => setEditing(null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="nk-page max-w-5xl">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="nk-label">{userEmail}</p>
          <h1 className="nk-title mt-2">Collection</h1>
          <p className="nk-subtitle mt-3">
            Your sticker book — products, services, companies, and personal
            brands you’ve crafted.
          </p>
        </div>
        <Link to="/make" className="nk-btn shrink-0">
          <Plus weight="bold" className="size-4" />
          Make a sticker
        </Link>
      </header>

      {stickers.length === 0 ? (
        <div className="relative overflow-hidden rounded-[32px] border border-dashed border-black/[0.1] bg-[#fafafa] px-6 py-20 text-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-6 rounded-[24px] border border-black/[0.04]"
          />
          <p className="text-[22px] font-semibold tracking-[-0.02em] text-neutral-900">
            Empty collection
          </p>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-neutral-500">
            Craft a sticker in Make, then place it — it lands here forever.
          </p>
          <Link to="/make" className="nk-btn mt-6">
            Start collecting
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {stickers.map((sticker, index) => {
            const tilt = TILTS[index % TILTS.length]
            return (
              <motion.li
                key={sticker.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.3,
                  delay: Math.min(index * 0.04, 0.28),
                  ease: [0.23, 1, 0.32, 1],
                }}
                className="group flex flex-col items-center"
              >
                <Link
                  to="/dashboard/stickers/$id"
                  params={{ id: sticker.id }}
                  className="relative block w-full"
                >
                  <div
                    className={cn(
                      "relative mx-auto aspect-square w-full max-w-[180px] rounded-[22px] border border-black/[0.06] bg-white p-4 shadow-[0_12px_28px_-16px_rgba(0,0,0,0.28)] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.03]"
                    )}
                    style={{ transform: `rotate(${tilt}deg)` }}
                  >
                    <img
                      src={sticker.imageUrl}
                      alt=""
                      className="size-full object-contain drop-shadow-md"
                    />
                  </div>
                </Link>
                <div className="mt-4 w-full text-center">
                  <Link
                    to="/dashboard/stickers/$id"
                    params={{ id: sticker.id }}
                    className="text-[15px] font-semibold tracking-[-0.02em] text-neutral-900"
                  >
                    {sticker.name}
                  </Link>
                  <p className="mt-0.5 text-[12px] font-medium tracking-[-0.01em] text-neutral-400">
                    {sticker.category}
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    <button
                      type="button"
                      className="press inline-flex size-8 items-center justify-center rounded-full bg-black/[0.045] text-neutral-700 hover:bg-black/[0.07]"
                      aria-label={`Edit ${sticker.name}`}
                      onClick={() => setEditing(sticker)}
                    >
                      <PencilSimple weight="bold" className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      className="press inline-flex size-8 items-center justify-center rounded-full bg-black/[0.045] text-red-600 hover:bg-red-50 disabled:opacity-35"
                      aria-label={`Delete ${sticker.name}`}
                      disabled={busyId === sticker.id}
                      onClick={() => void deleteSticker(sticker)}
                    >
                      <Trash weight="bold" className="size-3.5" />
                    </button>
                  </div>
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
