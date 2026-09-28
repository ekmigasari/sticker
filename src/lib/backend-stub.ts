/**
 * Phase 5 production API stubs.
 * The prototype uses Zustand + localStorage; swap these for real fetch calls later.
 * Contract details: docs/backend.md
 */

import type { Placement, Product, SizeTier } from "@/domain/types"
import { SIZE_TIERS } from "@/domain/types"

export type CheckoutSession = {
  id: string
  sizeTier: SizeTier
  amountCents: number
  status: "mock_created" | "mock_paid"
  checkoutUrl: string
}

export type WallQuery = {
  products: Product[]
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
  sizeTier: SizeTier,
  _product: Omit<Product, "id" | "createdAt">
): Promise<CheckoutSession> {
  const amountCents = SIZE_TIERS[sizeTier].price * 100
  return {
    id: `cs_mock_${crypto.randomUUID().slice(0, 8)}`,
    sizeTier,
    amountCents,
    status: "mock_created",
    checkoutUrl: "/place",
  }
}

/** Placeholder — replace with POST /api/reports */
export async function reportPlacement(
  placementId: string,
  reason: string
): Promise<{ ok: true }> {
  console.info("[moderation stub] report", { placementId, reason })
  return { ok: true }
}

export const BACKEND_STATUS = {
  auth: "planned",
  storage: "planned",
  stripe: "planned",
  moderation: "stubbed",
} as const
