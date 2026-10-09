import { useEffect, useState } from "react"
import { useRouter } from "@tanstack/react-router"
import {
  Camera,
  CaretRight,
  CheckCircle,
  Eye,
  EyeSlash,
} from "@phosphor-icons/react"
import { ProfileAvatar } from "@/components/profile-avatar"
import { authClient } from "@/lib/auth-client"
import { FormSheet } from "./form-sheet"

const AVATAR_PX = 512
const NAME_MAX = 60
const PASSWORD_MIN = 8
const PASSWORD_MAX = 128

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

type View = "profile" | "email" | "password"

const TITLES: Record<View, string> = {
  profile: "Edit Profile",
  email: "Change Email",
  password: "Change Password",
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
  const [view, setView] = useState<View>("profile")
  const [notice, setNotice] = useState<string | null>(null)
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setView("profile")
      setNotice(null)
    }
  }

  function finish(message: string) {
    setNotice(message)
    setView("profile")
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={TITLES[view]}
      onBack={view === "profile" ? undefined : () => setView("profile")}
    >
      <div hidden={view !== "profile"}>
        <ProfileForm
          profile={profile}
          notice={notice}
          onOpen={(next) => {
            setNotice(null)
            setView(next)
          }}
          onDone={() => onOpenChange(false)}
        />
      </div>
      {view === "email" ? (
        <EmailForm
          email={profile.email}
          onBack={() => setView("profile")}
          onDone={finish}
        />
      ) : null}
      {view === "password" ? (
        <PasswordForm
          email={profile.email}
          onBack={() => setView("profile")}
          onDone={finish}
        />
      ) : null}
    </FormSheet>
  )
}

function ProfileForm({
  profile,
  notice,
  onOpen,
  onDone,
}: {
  profile: Profile
  notice: string | null
  onOpen: (view: Exclude<View, "profile">) => void
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
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="nk-label">Sign-in & security</h3>
        <div className="divide-y divide-black/[0.06] overflow-hidden rounded-[14px] bg-[#f5f5f7]">
          <AccountRow
            label="Email"
            value={profile.email}
            onClick={() => onOpen("email")}
          />
          <AccountRow
            label="Password"
            value="••••••••"
            onClick={() => onOpen("password")}
          />
        </div>
        {notice ? (
          <p
            role="status"
            className="flex items-start gap-1.5 text-[13px] leading-snug font-medium text-emerald-700"
          >
            <CheckCircle weight="fill" className="mt-px size-4 shrink-0" />
            {notice}
          </p>
        ) : null}
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

function AccountRow({
  label,
  value,
  onClick,
}: {
  label: string
  value: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Change ${label.toLowerCase()}`}
      className="flex h-13 w-full items-center gap-3 px-4 text-left transition-colors hover:bg-black/[0.03]"
    >
      <span className="shrink-0 text-[15px] tracking-[-0.01em] text-neutral-900">
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate text-right text-[15px] tracking-[-0.01em] text-neutral-500">
        {value}
      </span>
      <CaretRight
        weight="bold"
        className="size-3.5 shrink-0 text-neutral-400"
      />
    </button>
  )
}

function PasswordField({
  id,
  label,
  name,
  autoComplete,
  hint,
}: {
  id: string
  label: string
  name: string
  autoComplete: "current-password" | "new-password"
  hint?: string
}) {
  const [shown, setShown] = useState(false)
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="nk-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={shown ? "text" : "password"}
          autoComplete={autoComplete}
          minLength={autoComplete === "new-password" ? PASSWORD_MIN : undefined}
          maxLength={PASSWORD_MAX}
          required
          className="nk-field pr-12"
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? "Hide password" : "Show password"}
          aria-pressed={shown}
          className="press absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-full text-neutral-400 transition-colors hover:text-neutral-700"
        >
          {shown ? (
            <EyeSlash weight="regular" className="size-[18px]" />
          ) : (
            <Eye weight="regular" className="size-[18px]" />
          )}
        </button>
      </div>
      {hint ? <p className="text-[12px] text-neutral-500">{hint}</p> : null}
    </div>
  )
}

function FormActions({
  pending,
  submit,
  pendingLabel,
  error,
  onBack,
}: {
  pending: boolean
  submit: string
  pendingLabel: string
  error: string | null
  onBack: () => void
}) {
  return (
    <>
      {error ? (
        <p role="alert" className="text-[14px] font-medium text-red-600">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={pending} className="nk-btn">
          {pending ? pendingLabel : submit}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onBack}
          className="nk-btn-secondary"
        >
          Cancel
        </button>
      </div>
    </>
  )
}

function EmailForm({
  email,
  onBack,
  onDone,
}: {
  email: string
  onBack: () => void
  onDone: (notice: string) => void
}) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    try {
      const response = await fetch("/api/account/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          newEmail: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      })
      const payload = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      if (!response.ok) {
        throw new Error(payload?.error ?? "Could not change email.")
      }
      await router.invalidate()
      onDone("Email updated. Use it the next time you sign in.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change email.")
      setPending(false)
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
      <p className="text-[14px] leading-snug text-neutral-500">
        You sign in with{" "}
        <span className="font-medium break-all text-neutral-900">{email}</span>.
        Enter your new email and current password to confirm it's you.
      </p>
      <div className="flex flex-col gap-2">
        <label htmlFor="account-email" className="nk-label">
          New email
        </label>
        <input
          id="account-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="name@example.com"
          required
          className="nk-field"
        />
      </div>
      <PasswordField
        id="account-email-password"
        label="Current password"
        name="password"
        autoComplete="current-password"
      />
      <FormActions
        pending={pending}
        submit="Change email"
        pendingLabel="Changing…"
        error={error}
        onBack={onBack}
      />
    </form>
  )
}

const PASSWORD_ERRORS: Record<string, string> = {
  INVALID_PASSWORD: "Your current password is incorrect.",
  PASSWORD_TOO_SHORT: `Use at least ${PASSWORD_MIN} characters.`,
  PASSWORD_TOO_LONG: `Use at most ${PASSWORD_MAX} characters.`,
  CREDENTIAL_ACCOUNT_NOT_FOUND: "This account doesn't sign in with a password.",
}

function PasswordForm({
  email,
  onBack,
  onDone,
}: {
  email: string
  onBack: () => void
  onDone: (notice: string) => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const currentPassword = String(form.get("current") ?? "")
    const newPassword = String(form.get("next") ?? "")
    const revokeOtherSessions = form.get("signOutOthers") === "on"
    if (newPassword.length < PASSWORD_MIN) {
      setError(`Use at least ${PASSWORD_MIN} characters.`)
      return
    }
    if (newPassword !== form.get("confirm")) {
      setError("The new passwords don't match.")
      return
    }
    if (newPassword === currentPassword) {
      setError("Choose a password different from your current one.")
      return
    }
    setPending(true)
    setError(null)
    const { error: changeError } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions,
    })
    if (changeError) {
      setError(
        (changeError.code && PASSWORD_ERRORS[changeError.code]) ||
          changeError.message ||
          "Could not change password."
      )
      setPending(false)
      return
    }
    onDone(
      revokeOtherSessions
        ? "Password changed. Other devices were signed out."
        : "Password changed."
    )
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-6">
      <input
        hidden
        readOnly
        type="email"
        name="username"
        autoComplete="username"
        value={email}
      />
      <PasswordField
        id="account-password-current"
        label="Current password"
        name="current"
        autoComplete="current-password"
      />
      <PasswordField
        id="account-password-new"
        label="New password"
        name="next"
        autoComplete="new-password"
        hint={`At least ${PASSWORD_MIN} characters.`}
      />
      <PasswordField
        id="account-password-confirm"
        label="Confirm new password"
        name="confirm"
        autoComplete="new-password"
      />
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          name="signOutOthers"
          defaultChecked
          className="mt-0.5 size-[18px] shrink-0 accent-neutral-900"
        />
        <span className="text-[14px] leading-snug text-neutral-700">
          Sign out of other devices
          <span className="block text-[12px] text-neutral-500">
            Recommended if you think someone else knows your password.
          </span>
        </span>
      </label>
      <FormActions
        pending={pending}
        submit="Change password"
        pendingLabel="Changing…"
        error={error}
        onBack={onBack}
      />
    </form>
  )
}
