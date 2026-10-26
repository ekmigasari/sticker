/**
 * Phase 5 production API stubs.
 * The prototype uses Zustand + localStorage; swap these for real fetch calls later.
 * Contract details: docs/backend.md
 */

import type { Placement, Sticker } from "@/domain/types"
import { plotPrice } from "@/domain/types"

export type CheckoutSession = {
  id: string
  unitsW: number
  unitsH: number
  amountCents: number
  status: "mock_created" | "mock_paid"
  checkoutUrl: string
}

export type WallQuery = {
  stickers: Sticker[]
  placements: Placement[]
}

/** Placeholder — replace with GET /api/wall */
export async function fetchWall(): Promise<WallQuery> {
  throw new Error(
    "Production wall API not wired. Use useWallStore hydrate() in the prototype."
  )
}

/** Placeholder — replace with POST /api/checkout (Stripe) */
export async function createCheckoutSession(
  unitsW: number,
  unitsH: number,
  _details: Omit<
    Sticker,
    | "id"
    | "slug"
    | "createdAt"
    | "imageDataUrl"
    | "outlineColor"
    | "outlineThickness"
  >
): Promise<CheckoutSession> {
  const amountCents = plotPrice(unitsW, unitsH) * 100
  return {
    id: `cs_mock_${crypto.randomUUID().slice(0, 8)}`,
    unitsW,
    unitsH,
    amountCents,
    status: "mock_created",
    checkoutUrl: "/place",
  }
}

/** Sends a sticker report. The signed-in user is taken from the session cookie. */
export async function reportSticker(
  stickerId: string,
  reason: string,
  details = ""
): Promise<{ ok: true }> {
  const response = await fetch("/api/reports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ stickerId, reason, details }),
  })
  const payload = (await response.json().catch(() => null)) as {
    error?: string
  } | null
  if (!response.ok) {
    throw new Error(payload?.error ?? "Could not send the report.")
  }
  return { ok: true }
}

export const BACKEND_STATUS = {
  auth: "planned",
  storage: "planned",
  stripe: "planned",
  moderation: "live",
} as const
