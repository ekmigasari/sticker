import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { Flag } from "@phosphor-icons/react"
import {
  Badge,
  ConfirmSheet,
  formatDate,
  type ConfirmRequest,
} from "@/components/admin/admin-ui"
import { dismissReport, upholdReport, type AdminReportRow } from "@/lib/admin"

const STATUS_TONE = {
  open: "amber",
  upheld: "red",
  dismissed: "neutral",
} as const

const STATUS_LABEL = {
  open: "Open",
  upheld: "Taken down",
  dismissed: "Dismissed",
} as const

export function ReportList({ reports }: { reports: AdminReportRow[] }) {
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  function takeDown(report: AdminReportRow) {
    const hidden = Boolean(report.sticker.hiddenAt)
    setConfirm({
      title: hidden ? "Resolve Report" : "Take Down Sticker",
      body: hidden ? (
        <>
          <span className="font-semibold text-neutral-900">
            {report.sticker.name}
          </span>{" "}
          is already off the wall. This closes every open report about it.
        </>
      ) : (
        <>
          <span className="font-semibold text-neutral-900">
            {report.sticker.name}
          </span>{" "}
          leaves the wall, directory and rankings. Every open report about it is
          closed.
        </>
      ),
      confirmLabel: hidden ? "Resolve" : "Take down",
      pendingLabel: hidden ? "Resolving…" : "Taking down…",
      destructive: !hidden,
      reasonLabel: hidden ? undefined : "Reason (shown to the owner)",
      onConfirm: (reason) =>
        upholdReport({
          data: { id: report.id, reason: reason || undefined },
        }),
    })
  }

  function dismiss(report: AdminReportRow) {
    setConfirm({
      title: "Dismiss Report",
      body: (
        <>
          Leave{" "}
          <span className="font-semibold text-neutral-900">
            {report.sticker.name}
          </span>{" "}
          up. This report is closed and the reporter can send a new one later.
        </>
      ),
      confirmLabel: "Dismiss",
      pendingLabel: "Dismissing…",
      onConfirm: () => dismissReport({ data: { id: report.id } }),
    })
  }

  return (
    <>
      <ul>
        {reports.map((report) => (
          <li
            key={report.id}
            className="border-b border-black/[0.06] py-4 last:border-b-0"
          >
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-[#f5f5f7] text-neutral-500">
                <Flag weight="fill" className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link
                    to="/stickers/$slug"
                    params={{ slug: report.sticker.slug }}
                    className="truncate text-[15px] font-semibold tracking-[-0.01em] text-neutral-900 hover:underline"
                  >
                    {report.sticker.name}
                  </Link>
                  <Badge tone={STATUS_TONE[report.status]}>
                    {STATUS_LABEL[report.status]}
                  </Badge>
                  {report.sticker.hiddenAt ? (
                    <Badge tone="red">Hidden</Badge>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[13px] text-neutral-500">
                  {report.reasonLabel}
                  {" · "}
                  <Link
                    to="/admin/users/$id"
                    params={{ id: report.reporter.id }}
                    className="hover:underline"
                  >
                    {report.reporter.email}
                  </Link>
                  {" · "}
                  {formatDate(report.createdAt)}
                </p>
                {report.details ? (
                  <p className="mt-1.5 line-clamp-3 text-[14px] leading-snug text-neutral-700">
                    {report.details}
                  </p>
                ) : null}
              </div>
            </div>
            {report.status === "open" ? (
              <div className="mt-3 flex gap-2 pl-[52px]">
                <button
                  type="button"
                  onClick={() => takeDown(report)}
                  className="press h-9 rounded-full bg-neutral-900 px-4 text-[13px] font-semibold tracking-[-0.01em] text-white"
                >
                  {report.sticker.hiddenAt ? "Resolve" : "Take down"}
                </button>
                <button
                  type="button"
                  onClick={() => dismiss(report)}
                  className="press h-9 rounded-full bg-[#f5f5f7] px-4 text-[13px] font-semibold tracking-[-0.01em] text-neutral-700"
                >
                  Dismiss
                </button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>
      <ConfirmSheet request={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}
