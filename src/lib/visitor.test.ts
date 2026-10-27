import { describe, expect, it } from "vitest"
import { hashVisitor, isBot, statsDay } from "@/lib/visitor"

describe("statsDay", () => {
  const lateUtc = new Date("2026-10-27T20:30:00.000Z")

  it("formats the UTC day", () => {
    expect(statsDay(lateUtc, "UTC")).toBe("2026-10-27")
  })

  it("rolls over in the configured time zone", () => {
    expect(statsDay(lateUtc, "Asia/Jakarta")).toBe("2026-10-28")
  })
})

describe("isBot", () => {
  it("flags crawlers and scripts", () => {
    expect(isBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true)
    expect(isBot("curl/8.7.1")).toBe(true)
    expect(isBot("Mozilla/5.0 HeadlessChrome/148.0")).toBe(true)
  })

  it("lets browsers through", () => {
    expect(
      isBot(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36"
      )
    ).toBe(false)
  })
})

describe("hashVisitor", () => {
  const base = {
    secret: "s",
    day: "2026-10-27",
    ip: "203.0.113.7",
    userAgent: "UA",
  }

  it("is stable within a day and changes with the day", async () => {
    const a = await hashVisitor(base)
    expect(await hashVisitor(base)).toBe(a)
    expect(await hashVisitor({ ...base, day: "2026-10-28" })).not.toBe(a)
    expect(a).toMatch(/^[0-9a-f]{32}$/)
  })
})
