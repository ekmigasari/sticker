import { createFileRoute, Link, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { AppChrome } from "@/components/layout/app-chrome"
import { Button, buttonVariants } from "@/components/ui/button"
import { MAX_UPLOAD_BYTES } from "@/lib/files"
import { listUploads } from "@/lib/session"
import { cn } from "@/lib/utils"

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
      <main className="mx-auto flex w-full max-w-4xl flex-col px-4 py-10 sm:px-8">
        <Link
          to="/dashboard"
          className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase hover:text-foreground"
        >
          ← Dashboard
        </Link>
        <p className="mt-4 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          {user.email}
        </p>
        <h1 className="mt-2 font-heading text-4xl font-extrabold tracking-tight">
          Your files
        </h1>
        <p className="mt-3 max-w-xl text-muted-foreground">
          Raw uploads stored for your account. Product stickers are managed from
          the dashboard.
        </p>

        <form
          onSubmit={(e) => void onSubmit(e)}
          className="mt-10 flex flex-col items-start gap-4 rounded-3xl border border-border bg-card/90 p-5 sm:flex-row sm:items-center"
        >
          <input
            name="file"
            type="file"
            required
            className="font-mono text-xs text-muted-foreground file:mr-4 file:rounded-xl file:border file:border-border file:bg-transparent file:px-3 file:py-2 file:font-mono file:text-xs file:tracking-widest file:text-foreground file:uppercase"
          />
          <Button type="submit" disabled={pending} className="rounded-2xl">
            {pending ? "Uploading" : "Upload"}
          </Button>
        </form>
        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <ul className="mt-10 divide-y divide-border rounded-3xl border border-border bg-card/80">
          {uploads.length === 0 ? (
            <li className="px-5 py-8 font-mono text-xs text-muted-foreground">
              No files yet.
            </li>
          ) : (
            uploads.map((upload) => (
              <li
                key={upload.id}
                className="flex items-baseline justify-between gap-4 px-5 py-4"
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

        <Link
          to="/dashboard"
          className={cn(buttonVariants({ variant: "outline" }), "mt-8 w-fit rounded-2xl")}
        >
          Back to products
        </Link>
      </main>
    </AppChrome>
  )
}
