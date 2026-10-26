/** Reasons a person can give when reporting a sticker. Matches the content rules. */
export const REPORT_REASONS = [
  { id: "sexual", label: "Sexual or adult content" },
  { id: "gambling", label: "Gambling" },
  { id: "alcohol", label: "Alcohol" },
  { id: "tobacco", label: "Tobacco or vaping" },
  { id: "drugs", label: "Drugs" },
  { id: "weapons", label: "Weapons" },
  { id: "hate", label: "Hate, harassment or violence" },
  { id: "scams", label: "Scams or deceptive offers" },
  { id: "health", label: "Unsafe health claims" },
  { id: "illegal", label: "Illegal products or services" },
  { id: "rights", label: "Someone else's rights" },
  { id: "minors", label: "Harmful to minors" },
  { id: "spam", label: "Spam or misleading" },
  { id: "other", label: "Something else" },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]["id"]

const DETAILS_MAX = 1000

export function reportReasonLabel(id: string): string | null {
  return REPORT_REASONS.find((reason) => reason.id === id)?.label ?? null
}

export function isReportReason(value: string): value is ReportReason {
  return REPORT_REASONS.some((reason) => reason.id === value)
}

/** Validates a report body. `other` needs a short explanation. */
export function parseReportInput(body: {
  stickerId?: unknown
  reason?: unknown
  details?: unknown
}):
  | { stickerId: string; reason: ReportReason; details: string }
  | { error: string } {
  const stickerId =
    typeof body.stickerId === "string" ? body.stickerId.trim() : ""
  const reason = typeof body.reason === "string" ? body.reason.trim() : ""
  const details =
    typeof body.details === "string"
      ? body.details.trim().slice(0, DETAILS_MAX)
      : ""

  if (!stickerId || stickerId.length > 64) {
    return { error: "Choose a sticker to report." }
  }
  if (!isReportReason(reason)) {
    return { error: "Choose what this report is about." }
  }
  if (reason === "other" && details.length < 8) {
    return { error: "Add a short note so we know what to look at." }
  }
  return { stickerId, reason, details }
}
