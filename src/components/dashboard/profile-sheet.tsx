import { useEffect, useState } from "react"
import { useRouter } from "@tanstack/react-router"
import { Camera } from "@phosphor-icons/react"
import { ProfileAvatar } from "@/components/profile-avatar"
import { authClient } from "@/lib/auth-client"
import { FormSheet } from "./form-sheet"

const AVATAR_PX = 512
const NAME_MAX = 60

export type Profile = { name: string; email: string; image: string | null }

/** Center-crop to a square and downscale so phone photos upload fast. */
async function squareAvatar(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const out = Math.min(AVATAR_PX, side)
  const canvas = document.createElement("canvas")
  canvas.width = out
  canvas.height = out
  canvas
    .getContext("2d")!
    .drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      out,
      out
    )
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Unreadable image."))),
      "image/jpeg",
      0.9
    )
  )
}

async function uploadAvatar(file: File): Promise<string> {
  const form = new FormData()
  form.set("file", new File([await squareAvatar(file)], "avatar.jpg"))
  const response = await fetch("/api/uploads", { method: "POST", body: form })
  const payload = (await response.json().catch(() => null)) as {
    id?: string
    error?: string
  } | null
  if (!response.ok || !payload?.id) {
    throw new Error(payload?.error ?? "Could not upload photo.")
  }
  return `/api/uploads/${payload.id}`
}

export function ProfileSheet({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: Profile
}) {
  return (
    <FormSheet open={open} onOpenChange={onOpenChange} title="Edit Profile">
      <ProfileForm profile={profile} onDone={() => onOpenChange(false)} />
    </FormSheet>
  )
}

function ProfileForm({
  profile,
  onDone,
}: {
  profile: Profile
  onDone: () => void
}) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [removed, setRemoved] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview]
  )

  const shownImage = file ? preview : removed ? null : profile.image

  function pick(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0]
    event.target.value = ""
    if (!next) return
    if (!next.type.startsWith("image/")) {
      setError("Choose an image file.")
      return
    }
    setError(null)
    setRemoved(false)
    setFile(next)
    setPreview(URL.createObjectURL(next))
  }

  function removePhoto() {
    setFile(null)
    setPreview(null)
    setRemoved(true)
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get("name") ?? "")
      .trim()
      .slice(0, NAME_MAX)
    if (!name) {
      setError("Add your name.")
      return
    }
    setPending(true)
    setError(null)
    try {
      const image = file
        ? await uploadAvatar(file)
        : removed
          ? null
          : profile.image
      const { error: updateError } = await authClient.updateUser({
        name,
        image,
      })
      if (updateError) throw new Error(updateError.message)
      await router.invalidate()
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profile.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={(e) => void save(e)} className="flex flex-col gap-6">
      <div className="flex flex-col items-center">
        <label className="group relative cursor-pointer">
          <ProfileAvatar
            name={profile.name}
            email={profile.email}
            image={shownImage}
            className="size-28 -rotate-3 text-[34px] shadow-[0_10px_22px_-8px_rgba(0,0,0,0.35)] ring-[5px] ring-white transition-[rotate] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:rotate-0"
          />
          <span className="absolute -right-1 bottom-1 grid size-9 place-items-center rounded-full bg-neutral-900 text-white shadow-[0_4px_10px_rgba(0,0,0,0.25)] ring-[3px] ring-white">
            <Camera weight="fill" className="size-4" />
          </span>
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={pick}
          />
          <span className="sr-only">Choose photo</span>
        </label>
        {shownImage ? (
          <button
            type="button"
            onClick={removePhoto}
            className="mt-4 text-[14px] font-medium tracking-[-0.01em] text-[#ff3b30] hover:opacity-80"
          >
            Remove photo
          </button>
        ) : (
          <p className="mt-4 max-w-xs text-center text-[13px] leading-snug text-neutral-500">
            Tap to add a photo. It becomes the sticker on your book's cover.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="profile-name" className="nk-label">
          Name
        </label>
        <input
          id="profile-name"
          name="name"
          required
          maxLength={NAME_MAX}
          defaultValue={profile.name}
          autoComplete="name"
          className="nk-field"
        />
        <p className="text-[12px] text-neutral-500">{profile.email}</p>
      </div>

      {error ? (
        <p className="text-[14px] font-medium text-red-600">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="nk-btn">
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onDone}
          className="nk-btn-secondary"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
