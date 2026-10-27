import DodoPayments from "dodopayments"
import type { Placement } from "@/domain/types"
import type { Prisma } from "@/generated/prisma/client"
import { emailEnabled } from "@/lib/email"
import { prisma } from "@/lib/prisma"
import { ranksFor, type StickerRankPair } from "@/lib/ranks"
import {
  allocateUniqueSlug,
  serializeSticker,
  type StickerDTO,
} from "@/lib/sticker-api"
import {
  moveOnWall,
  placeOnWall,
  restoreOnWall,
  type PlacementInput,
} from "@/lib/wall"

/** A new sticker's details, kept on the order until it's paid for. */
export type StickerListing = {
  name: string
  oneLiner: string
  url: string
  category: string
  description: string | null
  offer: string | null
  offerCode: string | null
  /** YYYY-MM-DD */
  offerExpiresOn: string | null
  style: string
  filter: string
  finish: string
  outlineColor: string
  outlineThickness: number
}

export type WallIntent =
  | {
      kind: "place"
      uploadId: string
      listing: StickerListing
      plot: PlacementInput
    }
  | {
      kind: "move"
      stickerId: string
      placementId: string | null
      plot: PlacementInput
    }
  | { kind: "restore"; stickerId: string; placementIds: string[] }

type RankChange = { before?: StickerRankPair; after: StickerRankPair } | null

export type WallResult =
  | { kind: "place"; sticker: StickerDTO; placement: Placement }
  | {
      kind: "move"
      sticker: StickerDTO
      placement: Placement
      movedFrom: string | null
      price: number
      rank: RankChange
    }
  | {
      kind: "restore"
      sticker: StickerDTO
      placements: Placement[]
      price: number
      rank: RankChange
    }

/** The wall can't take this action. A paid order is refunded. */
export class OrderError extends Error {
  constructor(
    message: string,
    readonly status = 409,
    /** Set when a restore's price moved. */
    readonly price?: number
  ) {
    super(message)
  }
}

/** Without Dodo keys every purchase goes through at once (local development and tests). */
export function paymentsEnabled() {
  return Boolean(
    process.env.DODO_PAYMENTS_API_KEY && process.env.DODO_PRODUCT_ID
  )
}

let client: DodoPayments | undefined

function dodo() {
  client ??= new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY,
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? null,
    environment:
      process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
        ? "live_mode"
        : "test_mode",
  })
  return client
}

function siteUrl(path: string) {
  return new URL(
    path,
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000"
  ).toString()
}

type Claim = (tx: Prisma.TransactionClient) => Promise<boolean>

async function rankOf(stickerId: string) {
  return (await ranksFor([stickerId])).get(stickerId)
}

async function ownedSticker(
  tx: Prisma.TransactionClient,
  stickerId: string,
  userId: string,
  verb: string
) {
  const sticker = await tx.sticker.findFirst({
    where: { id: stickerId, userId },
    select: { archivedAt: true, hiddenAt: true },
  })
  if (!sticker) throw new OrderError("Sticker not found.", 404)
  if (sticker.hiddenAt) {
    throw new OrderError("This sticker was taken down by a moderator.", 403)
  }
  if (sticker.archivedAt) {
    throw new OrderError(`Unarchive this sticker to ${verb} it on the wall.`)
  }
}

/**
 * Apply a wall action. `claim` runs first in the same transaction; when it
 * returns false the action already happened and nothing is written. A paid
 * restore goes through at the price paid, even if the wall moved since.
 */
async function applyIntent(
  userId: string,
  intent: WallIntent,
  amount: number,
  options: { paid: boolean; claim?: Claim }
): Promise<WallResult | null> {
  const claimed = async (tx: Prisma.TransactionClient) =>
    !options.claim || (await options.claim(tx))

  if (intent.kind === "place") {
    const stickerId = crypto.randomUUID()
    const slug = await allocateUniqueSlug(intent.listing.name)
    const { offerExpiresOn, ...listing } = intent.listing
    return prisma.$transaction(async (tx) => {
      if (!(await claimed(tx))) return null
      const upload = await tx.upload.findFirst({
        where: { id: intent.uploadId, userId },
        select: { id: true },
      })
      if (!upload) throw new OrderError("The sticker image is gone.", 404)
      const sticker = await tx.sticker.create({
        data: {
          id: stickerId,
          userId,
          slug,
          ...listing,
          offerExpiresOn: offerExpiresOn
            ? new Date(`${offerExpiresOn}T00:00:00Z`)
            : null,
          uploadId: upload.id,
          totalSpent: amount,
        },
      })
      const placement = await placeOnWall(tx, stickerId, intent.plot)
      return {
        kind: "place" as const,
        sticker: serializeSticker(sticker),
        placement,
      }
    })
  }

  const before = await rankOf(intent.stickerId)

  if (intent.kind === "move") {
    const placement = await prisma.$transaction(async (tx) => {
      if (!(await claimed(tx))) return null
      await ownedSticker(tx, intent.stickerId, userId, "move")
      const moved = await moveOnWall(
        tx,
        intent.stickerId,
        intent.placementId,
        intent.plot
      )
      if (!moved) {
        throw new OrderError(
          intent.placementId
            ? "That spot is no longer on the wall."
            : "This sticker already has a spot. Move that one instead."
        )
      }
      await tx.sticker.update({
        where: { id: intent.stickerId },
        data: { totalSpent: { increment: amount } },
      })
      return moved
    })
    if (!placement) return null
    const sticker = await prisma.sticker.findUniqueOrThrow({
      where: { id: intent.stickerId },
    })
    const after = await rankOf(intent.stickerId)
    return {
      kind: "move",
      sticker: serializeSticker(sticker),
      placement,
      movedFrom: intent.placementId,
      price: amount,
      rank: after ? { before, after } : null,
    }
  }

  const placements = await prisma.$transaction(async (tx) => {
    if (!(await claimed(tx))) return null
    await ownedSticker(tx, intent.stickerId, userId, "restore")
    const restored = await restoreOnWall(
      tx,
      intent.stickerId,
      intent.placementIds,
      options.paid ? null : amount
    )
    if (!restored.ok) {
      throw new OrderError(
        "The price changed while you were checking out.",
        409,
        restored.price
      )
    }
    if (!restored.placements.length) {
      throw new OrderError("Those spots are already fully visible.")
    }
    await tx.sticker.update({
      where: { id: intent.stickerId },
      data: { totalSpent: { increment: amount } },
    })
    return restored.placements
  })
  if (!placements) return null
  const sticker = await prisma.sticker.findUniqueOrThrow({
    where: { id: intent.stickerId },
  })
  const after = await rankOf(intent.stickerId)
  return {
    kind: "restore",
    sticker: serializeSticker(sticker),
    placements,
    price: amount,
    rank: after ? { before, after } : null,
  }
}

export type Buyer = {
  id: string
  email: string
  name: string
  emailVerified: boolean
}

/** Paying needs a confirmed email, once there's a way to send the link. */
export function unverifiedBuyer(user: Buyer): Response | null {
  if (!emailEnabled() || user.emailVerified) return null
  return Response.json(
    {
      error: "Confirm your email before paying.",
      code: "email_unverified",
      email: user.email,
    },
    { status: 403 }
  )
}

/**
 * Charge for a wall action. With Dodo set up this answers `{ checkoutUrl }`
 * and the action runs once the payment succeeds; otherwise it runs now and
 * answers with the result.
 */
export async function purchase(input: {
  user: Buyer
  intent: WallIntent
  /** Whole dollars. */
  amount: number
  /** Where Dodo's checkout sends a buyer who backs out. */
  cancelPath: string
}): Promise<Response> {
  const { user, intent, amount } = input
  const unverified = unverifiedBuyer(user)
  if (unverified) return unverified

  if (!paymentsEnabled()) {
    try {
      const result = await applyIntent(user.id, intent, amount, {
        paid: false,
      })
      return Response.json(result, {
        status: intent.kind === "place" ? 201 : 200,
      })
    } catch (error) {
      if (!(error instanceof OrderError)) throw error
      return Response.json(
        { error: error.message, price: error.price },
        { status: error.status }
      )
    }
  }

  const orderId = crypto.randomUUID()
  await prisma.wallOrder.create({
    data: {
      id: orderId,
      userId: user.id,
      kind: intent.kind,
      amount,
      intent: intent as unknown as Prisma.InputJsonValue,
    },
  })
  try {
    const session = await dodo().checkoutSessions.create({
      product_cart: [
        {
          product_id: process.env.DODO_PRODUCT_ID!,
          quantity: 1,
          amount: amount * 100,
        },
      ],
      customer: { email: user.email, name: user.name },
      return_url: siteUrl(`/checkout/${orderId}`),
      cancel_url: siteUrl(input.cancelPath),
      metadata: { order_id: orderId },
    })
    if (!session.checkout_url) throw new Error("Dodo returned no checkout URL")
    await prisma.wallOrder.update({
      where: { id: orderId },
      data: { checkoutId: session.session_id },
    })
    return Response.json({ checkoutUrl: session.checkout_url })
  } catch (error) {
    console.error("Dodo checkout failed", error)
    await prisma.wallOrder.delete({ where: { id: orderId } })
    return Response.json(
      { error: "Checkout is unavailable right now. Try again in a minute." },
      { status: 502 }
    )
  }
}

type PaymentInfo = {
  payment_id: string
  status?: string | null
  checkout_session_id?: string | null
  metadata: Record<string, string | number | boolean>
}

/**
 * Run the paid action for a successful payment. Safe to call more than once
 * (webhook retries, the return page): only the first call does anything. If
 * the wall can't take the action anymore, the payment is refunded.
 */
export async function settlePayment(payment: PaymentInfo) {
  if (payment.status !== "succeeded") return
  const orderId = payment.metadata.order_id
  if (typeof orderId !== "string") return
  const order = await prisma.wallOrder.findUnique({ where: { id: orderId } })
  if (!order || order.status !== "pending") return
  if (
    payment.checkout_session_id &&
    payment.checkout_session_id !== order.checkoutId
  ) {
    return
  }

  try {
    const result = await applyIntent(
      order.userId,
      order.intent as unknown as WallIntent,
      order.amount,
      {
        paid: true,
        claim: async (tx) => {
          const claimed = await tx.wallOrder.updateMany({
            where: { id: order.id, status: "pending" },
            data: { status: "fulfilled", paymentId: payment.payment_id },
          })
          return claimed.count === 1
        },
      }
    )
    if (result) {
      await prisma.wallOrder.update({
        where: { id: order.id },
        data: { result: result as unknown as Prisma.InputJsonValue },
      })
    }
  } catch (error) {
    if (!(error instanceof OrderError)) throw error
    const failed = await prisma.wallOrder.updateMany({
      where: { id: order.id, status: "pending" },
      data: {
        status: "failed",
        paymentId: payment.payment_id,
        error: error.message,
      },
    })
    if (!failed.count) return
    try {
      await dodo().refunds.create({
        payment_id: payment.payment_id,
        reason: error.message,
      })
    } catch (refundError) {
      console.error("Dodo refund failed", order.id, refundError)
      await prisma.wallOrder.update({
        where: { id: order.id },
        data: { status: "refund_failed" },
      })
    }
  }
}

/** Verify a Dodo webhook and settle the payment it reports. */
export async function handleDodoWebhook(request: Request): Promise<Response> {
  if (!paymentsEnabled() || !process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
    return Response.json({ error: "Payments are off." }, { status: 404 })
  }
  const body = await request.text()
  let event: ReturnType<DodoPayments["webhooks"]["unwrap"]>
  try {
    event = dodo().webhooks.unwrap(body, {
      headers: {
        "webhook-id": request.headers.get("webhook-id") ?? "",
        "webhook-signature": request.headers.get("webhook-signature") ?? "",
        "webhook-timestamp": request.headers.get("webhook-timestamp") ?? "",
      },
    })
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 401 })
  }
  if (event.type === "payment.succeeded") await settlePayment(event.data)
  return Response.json({ received: true })
}

export type OrderView = {
  id: string
  kind: WallIntent["kind"]
  amount: number
  status: "pending" | "fulfilled" | "failed"
  result: WallResult | null
  error: string | null
  /** Dodo's status for the payment, while the order waits on it. */
  paymentStatus: string | null
}

/**
 * The buyer's view of an order. While it's pending, `paymentId` (from the
 * checkout return URL) is checked with Dodo directly, so the order settles
 * even before the webhook arrives.
 */
export async function getOrderForBuyer(
  orderId: string,
  userId: string,
  paymentId: string | null
): Promise<OrderView | null> {
  let order = await prisma.wallOrder.findFirst({
    where: { id: orderId, userId },
  })
  if (!order) return null

  let paymentStatus: string | null = null
  if (order.status === "pending" && paymentId && paymentsEnabled()) {
    try {
      const payment = await dodo().payments.retrieve(paymentId)
      if (payment.metadata.order_id === order.id) {
        paymentStatus = payment.status ?? null
        await settlePayment(payment)
        order = await prisma.wallOrder.findUniqueOrThrow({
          where: { id: order.id },
        })
      }
    } catch (error) {
      console.error("Dodo payment lookup failed", paymentId, error)
    }
  }

  return {
    id: order.id,
    kind: order.kind as WallIntent["kind"],
    amount: order.amount,
    status:
      order.status === "refund_failed"
        ? "failed"
        : (order.status as OrderView["status"]),
    result: order.result as unknown as WallResult | null,
    error: order.error,
    paymentStatus,
  }
}
