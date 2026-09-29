import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { AppChrome } from "@/components/layout/app-chrome"
import { MAX_UPLOAD_BYTES } from "@/lib/files"
import { listUploads } from "@/lib/session"

export const Route = createFileRoute("/_protected/files")({
  loader: () => listUploads(),
  component: FilesPage,
})

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function FilesPage() {
  const uploads = Route.useLoaderData()
  const { user } = Route.useRouteContext()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    const form = event.currentTarget
    const file = new FormData(form).get("file")
    if (!(file instanceof File) || file.size === 0) {
      setError("Choose a file to upload.")
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Files must be 10 MB or smaller.")
      return
    }

    setPending(true)
    const response = await fetch("/api/uploads", {
      method: "POST",
      body: new FormData(form),
    })
    setPending(false)

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      setError(payload?.error ?? "Upload failed.")
      return
    }

    form.reset()
    await router.invalidate()
  }

  return (
    <AppChrome>
      <main className="nk-page">
        <div>
          <Link
            to="/dashboard"
            className="press inline-flex text-[13px] font-medium tracking-[-0.01em] text-neutral-500 transition-colors hover:text-neutral-900"
          >
            ← Your stickers
          </Link>
          <p className="nk-label mt-5">{user.email}</p>
          <h1 className="nk-title mt-2">Your files</h1>
          <p className="nk-subtitle mt-3">
            Raw uploads for your account. Sticker artwork is managed from the
            dashboard.
          </p>
        </div>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="flex flex-col items-start gap-4 rounded-[28px] border border-black/[0.06] bg-white p-5 sm:flex-row sm:items-center"
        >
          <input
            name="file"
            type="file"
            required
            className="w-full text-[13px] text-neutral-500 file:mr-4 file:rounded-full file:border-0 file:bg-black/[0.06] file:px-4 file:py-2 file:text-[13px] file:font-medium file:text-neutral-900"
          />
          <button type="submit" disabled={pending} className="nk-btn shrink-0">
            {pending ? "Uploading…" : "Upload"}
          </button>
        </form>
        {error ? (
          <p className="text-[14px] font-medium text-red-600">{error}</p>
        ) : null}

        <ul className="divide-y divide-black/[0.06]">
          {uploads.length === 0 ? (
            <li className="py-10 text-center text-[15px] text-neutral-500">
              No files yet.
            </li>
          ) : (
            uploads.map((upload) => (
              <li
                key={upload.id}
                className="flex items-baseline justify-between gap-4 py-4"
              >
                <a
                  href={`/api/uploads/${upload.id}`}
                  className="text-[15px] font-medium tracking-[-0.01em] text-neutral-900 underline underline-offset-4"
                >
                  {upload.fileName}
                </a>
                <span className="shrink-0 text-[13px] text-neutral-400">
                  {formatBytes(upload.sizeBytes)}
                </span>
              </li>
            ))
          )}
        </ul>

        <Link to="/dashboard" className="nk-btn-secondary w-fit">
          Back to stickers
        </Link>
      </main>
    </AppChrome>
  )
}
