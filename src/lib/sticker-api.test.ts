import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))

const { parseStickerDetails } = await import("@/lib/sticker-api")

const base = {
  name: "ShipKit",
  oneLiner: "Launch checklists that actually get checked.",
  url: "shipkit.dev",
  category: "Developer Tools",
}

describe("parseStickerDetails", () => {
  it("stores optional description and promo fields", () => {
    const parsed = parseStickerDetails({
      ...base,
      description: "  Long story.  ",
      offer: "20% off your first year",
      offerCode: "LAUNCH20",
    })
    expect(parsed).toMatchObject({
      data: {
        description: "Long story.",
        offer: "20% off your first year",
        offerCode: "LAUNCH20",
      },
    })
  })

  it("clears blank or missing optional fields", () => {
    const parsed = parseStickerDetails({ ...base, description: "   " })
    expect(parsed).toMatchObject({
      data: { description: null, offer: null, offerCode: null },
    })
  })

  it("requires a deal description when a code or end date is set", () => {
    expect(parseStickerDetails({ ...base, offerCode: "LAUNCH20" })).toEqual({
      error: "Describe the deal for your promo.",
    })
    expect(
      parseStickerDetails({ ...base, offerExpiresOn: "2026-12-31" })
    ).toEqual({ error: "Describe the deal for your promo." })
  })

  it("stores the end date and rejects impossible dates", () => {
    const parsed = parseStickerDetails({
      ...base,
      offer: "Launch week deal",
      offerExpiresOn: "2026-12-31",
    })
    expect(parsed).toMatchObject({
      data: { offerExpiresOn: new Date("2026-12-31T00:00:00Z") },
    })
    expect(
      parseStickerDetails({ ...base, offer: "x", offerExpiresOn: "2026-02-30" })
    ).toEqual({ error: "Enter a valid promo expiry date." })
  })

  it("rejects codes with spaces and legacy categories", () => {
    expect(parseStickerDetails({ ...base, offerCode: "LAUNCH 20" })).toEqual({
      error: "Discount codes can't contain spaces.",
    })
    expect(parseStickerDetails({ ...base, category: "SaaS" })).toEqual({
      error: "Pick a valid category.",
    })
  })
})
