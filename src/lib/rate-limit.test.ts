import { describe, expect, it } from "vitest"
import { nextBucket, rateLimitDecision } from "@/lib/rate-limit"
import { parseReportInput } from "@/lib/report-reasons"

describe("fixed-window rate limit", () => {
  const now = new Date("2026-10-26T08:00:00.000Z")

  it("starts a new window at 1", () => {
    const bucket = nextBucket(null, now, 60)
    expect(bucket.count).toBe(1)
    expect(bucket.resetAt.toISOString()).toBe("2026-10-26T08:01:00.000Z")
  })

  it("increments inside the window and resets once it has elapsed", () => {
    const open = nextBucket(null, now, 60)
    const again = nextBucket(open, new Date(now.getTime() + 1000), 60)
    expect(again.count).toBe(2)
    expect(again.resetAt).toEqual(open.resetAt)

    const later = nextBucket(open, new Date(open.resetAt.getTime() + 1), 60)
    expect(later.count).toBe(1)
    expect(later.resetAt.getTime()).toBeGreaterThan(open.resetAt.getTime())
  })

  it("allows up to the max and then reports how long to wait", () => {
    const resetAt = new Date(now.getTime() + 15_000)
    expect(rateLimitDecision(5, 5, resetAt, now).allowed).toBe(true)
    const blocked = rateLimitDecision(6, 5, resetAt, now)
    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
    expect(blocked.retryAfter).toBe(15)
  })
})

describe("report input", () => {
  it("accepts a known reason", () => {
    expect(
      parseReportInput({ stickerId: "st_1", reason: "spam", details: "" })
    ).toEqual({ stickerId: "st_1", reason: "spam", details: "" })
  })

  it("requires a note when the reason is something else", () => {
    expect(
      parseReportInput({ stickerId: "st_1", reason: "other", details: "no" })
    ).toEqual({
      error: "Add a short note so we know what to look at.",
    })
    expect(
      parseReportInput({
        stickerId: "st_1",
        reason: "other",
        details: "This links to a copy of my site.",
      })
    ).toMatchObject({ reason: "other" })
  })

  it("rejects an unknown reason", () => {
    expect(parseReportInput({ stickerId: "st_1", reason: "bored" })).toEqual({
      error: "Choose what this report is about.",
    })
  })
})
