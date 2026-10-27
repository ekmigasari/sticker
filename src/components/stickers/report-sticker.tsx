import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Flag } from "@phosphor-icons/react"
import { FormSheet } from "@/components/dashboard/form-sheet"
import { track } from "@/lib/analytics"
import { REPORT_REASONS, type ReportReason } from "@/lib/report-reasons"
import { reportSticker } from "@/lib/backend-stub"

export function ReportSticker({
  stickerId,
  slug,
  signedIn,
}: {
  stickerId: string
  slug: string
  signedIn: boolean
}) {
  const [open, setOpen] = useState(false)

  if (!signedIn) {
    return (
      <Link
        to="/sign-in"
        search={{ next: `/stickers/${slug}` }}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-neutral-400 transition-colors hover:text-neutral-700"
      >
        <Flag weight="bold" className="size-3.5" />
        Report this sticker
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-neutral-400 transition-colors hover:text-neutral-700"
      >
        <Flag weight="bold" className="size-3.5" />
        Report this sticker
      </button>
      <ReportSheet open={open} stickerId={stickerId} onOpenChange={setOpen} />
    </>
  )
}

function ReportSheet({
  open,
  stickerId,
  onOpenChange,
}: {
  open: boolean
  stickerId: string
  onOpenChange: (open: boolean) => void
}) {
  const [reason, setReason] = useState<ReportReason>("spam")
  const [details, setDetails] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  function close(next: boolean) {
    if (pending) return
    if (!next) {
      setError(null)
      setSent(false)
      setDetails("")
      setReason("spam")
    }
    onOpenChange(next)
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      await reportSticker(stickerId, reason, details)
      track("sticker_reported", { reason })
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send the report."
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <FormSheet open={open} onOpenChange={close} title="Report Sticker">
      {sent ? (
        <div className="flex flex-col gap-5">
          <p className="text-[15px] leading-snug text-neutral-600">
            Thanks. A moderator will look at this sticker. You can send another
            report after this one is reviewed.
          </p>
          <button type="button" onClick={() => close(false)} className="nk-btn">
            Done
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-5"
        >
          <p className="text-[15px] leading-snug text-neutral-600">
            Tell us what breaks the rules. We review every report. False or
            repeated reports can lead to a ban.
          </p>
          <label className="flex flex-col gap-2">
            <span className="nk-label">What's wrong</span>
            <select
              value={reason}
              onChange={(event) =>
                setReason(event.target.value as ReportReason)
              }
              className="nk-field"
            >
              {REPORT_REASONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="nk-label">
              Details{reason === "other" ? "" : " (optional)"}
            </span>
            <textarea
              value={details}
              maxLength={1000}
              required={reason === "other"}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="What should we look at?"
              className="nk-textarea min-h-28"
            />
          </label>
          {error ? (
            <p role="alert" className="text-[14px] font-medium text-[#ff3b30]">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="nk-btn flex-1">
              {pending ? "Sending…" : "Send report"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => close(false)}
              className="nk-btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </FormSheet>
  )
}
