import { createFileRoute, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { Button } from "@/components/ui/button"
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
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col py-16">
      <p className="font-mono text-xs tracking-[0.25em] text-muted-foreground uppercase">
        {user.email}
      </p>
      <h1 className="mt-4 font-heading text-4xl font-medium tracking-tight">
        Your files
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-loose text-muted-foreground">
        Uploads are stored in S3. This list is the record Prisma keeps for your
        account.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
      >
        <input
          name="file"
          type="file"
          required
          className="font-mono text-xs text-muted-foreground file:mr-4 file:border file:border-border file:bg-transparent file:px-3 file:py-2 file:font-mono file:text-xs file:tracking-widest file:text-foreground file:uppercase"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Uploading" : "Upload"}
        </Button>
      </form>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <ul className="mt-12 divide-y divide-border border-t border-border">
        {uploads.length === 0 ? (
          <li className="py-6 font-mono text-xs text-muted-foreground">
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
                className="text-sm underline underline-offset-4"
              >
                {upload.fileName}
              </a>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {formatBytes(upload.sizeBytes)}
              </span>
            </li>
          ))
        )}
      </ul>
    </main>
  )
}
