import { useState } from "react"
import { useRouter } from "@tanstack/react-router"
import { Archive, Lock } from "@phosphor-icons/react"
import { StickerDetail } from "@/components/stickers/sticker-detail"
import type { StickerDTO } from "@/lib/sticker-api"
import type { StickerWithPlacements } from "@/lib/stickers"
import { FormSheet } from "./form-sheet"
import { StickerForm, type StickerFormValues } from "./sticker-form"

async function patchSticker(id: string, body: object) {
  const response = await fetch(`/api/stickers/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string
    } | null
    throw new Error(payload?.error ?? "Could not save.")
  }
}

export function StickerManage({
  sticker,
  all,
}: {
  sticker: StickerWithPlacements | null
  all: StickerDTO[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  async function saveDetails(values: StickerFormValues) {
    if (!sticker) return
    await patchSticker(sticker.id, values)
    await router.invalidate()
    setEditing(false)
  }

  async function setArchived(archived: boolean) {
    if (!sticker) return
    await patchSticker(sticker.id, { archived })
    await router.invalidate()
    setEditing(false)
  }

  return (
    <>
      <StickerDetail
        sticker={sticker}
        all={all}
        back={{ to: "/dashboard", label: "Dashboard" }}
        action={
          sticker ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="press -mr-2 inline-flex h-9 items-center rounded-full px-3 text-[16px] font-semibold tracking-[-0.01em] text-[#0071e3] transition-colors hover:bg-[#0071e3]/[0.06]"
            >
              Edit
            </button>
          ) : null
        }
        notice={
          sticker?.archivedAt ? (
            <ArchivedNotice onUnarchive={() => setArchived(false)} />
          ) : null
        }
      />
      {sticker ? (
        <EditSheet
          open={editing}
          onOpenChange={setEditing}
          sticker={sticker}
          onSave={saveDetails}
          onArchive={() => setArchived(true)}
        />
      ) : null}
    </>
  )
}

function ArchivedNotice({ onUnarchive }: { onUnarchive: () => Promise<void> }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function unarchive() {
    setPending(true)
    setError(null)
    try {
      await onUnarchive()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unarchive.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mt-3 flex items-center gap-3 rounded-[18px] bg-[#f5f5f7] py-3 pr-3 pl-4">
      <Archive weight="fill" className="size-5 shrink-0 text-neutral-400" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold tracking-[-0.01em] text-neutral-900">
          Archived
        </p>
        <p className="text-[13px] leading-snug text-neutral-500">
          {error ??
            "Hidden from the directory and rankings. Its wall spots stay."}
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => void unarchive()}
        className="press h-9 shrink-0 rounded-full bg-white px-4 text-[14px] font-semibold tracking-[-0.01em] text-[#0071e3] shadow-[0_1px_2px_rgba(0,0,0,0.05)] ring-1 ring-black/[0.06] transition-colors hover:bg-neutral-50 disabled:opacity-40"
      >
        {pending ? "Restoring…" : "Unarchive"}
      </button>
    </div>
  )
}

function EditSheet({
  open,
  onOpenChange,
  sticker,
  onSave,
  onArchive,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sticker: StickerDTO
  onSave: (values: StickerFormValues) => Promise<void>
  onArchive: () => Promise<void>
}) {
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Edit Sticker">
      <div className="flex items-center gap-4 pb-5">
        <img
          src={sticker.imageUrl}
          alt=""
          className="size-16 shrink-0 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.14)]"
        />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em]">
            Artwork
            <Lock weight="fill" className="size-3.5 text-neutral-400" />
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-neutral-500">
            The artwork is locked once made. You can still change everything
            below.
          </p>
        </div>
      </div>

      <StickerForm
        initial={sticker}
        submitLabel="Save"
        onSubmit={onSave}
        onCancel={() => onOpenChange(false)}
      />

      {sticker.archivedAt ? null : <ArchiveRow onArchive={onArchive} />}
    </FormSheet>
  )
}

function ArchiveRow({ onArchive }: { onArchive: () => Promise<void> }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function archive() {
    setPending(true)
    setError(null)
    try {
      await onArchive()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not archive.")
      setPending(false)
    }
  }

  return (
    <div className="mt-8 border-t border-black/[0.06] pt-5">
      {confirming ? (
        <div className="rounded-[18px] bg-[#f5f5f7] p-4">
          <p className="text-[15px] font-semibold tracking-[-0.01em]">
            Archive this sticker?
          </p>
          <p className="mt-1 text-[13px] leading-snug text-neutral-500">
            It leaves the directory and rankings. The spots you paid for stay on
            the wall, and you can unarchive any time.
          </p>
          {error ? (
            <p className="mt-2 text-[13px] font-medium text-[#ff3b30]">
              {error}
            </p>
          ) : null}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => void archive()}
              className="press h-10 rounded-full bg-[#ff3b30] px-5 text-[15px] font-semibold tracking-[-0.01em] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {pending ? "Archiving…" : "Archive"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="press h-10 rounded-full bg-white px-5 text-[15px] font-semibold tracking-[-0.01em] text-neutral-900 ring-1 ring-black/[0.06] transition-colors hover:bg-neutral-50 disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="press flex h-12 w-full items-center justify-center gap-2 rounded-[14px] bg-[#f5f5f7] text-[15px] font-semibold tracking-[-0.01em] text-[#ff3b30] transition-colors hover:bg-[#ededf0]"
        >
          <Archive weight="bold" className="size-4" />
          Archive Sticker
        </button>
      )}
    </div>
  )
}
