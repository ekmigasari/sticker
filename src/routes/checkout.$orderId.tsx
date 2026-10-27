import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import {
  CheckCircle,
  CircleNotch,
  MapPin,
  WarningCircle,
} from "@phosphor-icons/react"
import { AppChrome } from "@/components/layout/app-chrome"
import { RankMove } from "@/components/stickers/restore-sheet"
import type { OrderView, WallResult } from "@/lib/payments"
import { SITE_NAME } from "@/lib/seo"
import { useWallStore } from "@/store/wall-store"

/** Dodo sends the buyer here after checkout, with `payment_id` appended. */
export const Route = createFileRoute("/checkout/$orderId")({
  validateSearch: (search: Record<string, unknown>) => ({
    payment_id:
      typeof search.payment_id === "string" ? search.payment_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: `Checkout · ${SITE_NAME}` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturnPage,
})

const POLL_MS = 2000
const GIVE_UP_MS = 2 * 60_000
/** Dodo payment states that won't turn into a success on their own. */
const DEAD_PAYMENT = new Set(["failed", "cancelled"])

type Problem = "sign-in" | "missing" | "slow"

function useOrder(orderId: string, paymentId: string | undefined) {
  const [order, setOrder] = useState<OrderView | null>(null)
  const [problem, setProblem] = useState<Problem | null>(null)

  useEffect(() => {
    let stopped = false
    let timer: number | undefined
    const started = Date.now()
    const query = paymentId
      ? `?payment_id=${encodeURIComponent(paymentId)}`
      : ""

    async function poll() {
      const response = await fetch(`/api/orders/${orderId}${query}`).catch(
        () => null
      )
      if (stopped) return
      if (response?.status === 401) return setProblem("sign-in")
      if (response?.status === 404) return setProblem("missing")
      const next = response?.ok ? ((await response.json()) as OrderView) : null
      if (stopped) return
      if (next) {
        setOrder(next)
        if (next.status !== "pending") return
        if (next.paymentStatus && DEAD_PAYMENT.has(next.paymentStatus)) return
      }
      if (Date.now() - started > GIVE_UP_MS) return setProblem("slow")
      timer = window.setTimeout(poll, POLL_MS)
    }

    void poll()
    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [orderId, paymentId])

  return { order, problem }
}

const SUCCESS: Record<WallResult["kind"], { title: string; body: string }> = {
  place: {
    title: "You\u2019re on the wall",
    body: "Your placement is permanent. Newer stickers can cover it \u2014 that\u2019s the game. Your sticker stays listed in Stickers either way.",
  },
  move: {
    title: "In its new spot",
    body: "Your sticker sits on top of everything in its new spot. What you paid adds to your total. Newer stickers can still cover it.",
  },
  restore: {
    title: "Back on top",
    body: "Your sticker is fully visible again, in the same spot. Newer stickers can still cover it.",
  },
}

function CheckoutReturnPage() {
  const { orderId } = Route.useParams()
  const { payment_id } = Route.useSearch()
  const { order, problem } = useOrder(orderId, payment_id)
  const navigate = useNavigate()
  const focusPlacement = useWallStore((s) => s.focusPlacement)
  const setDraftSticker = useWallStore((s) => s.setDraftSticker)
  const setPlaceDraft = useWallStore((s) => s.setPlaceDraft)

  const fulfilled = order?.status === "fulfilled" ? order : null
  useEffect(() => {
    if (!fulfilled || fulfilled.kind === "restore") return
    setDraftSticker(null)
    setPlaceDraft(null)
  }, [fulfilled, setDraftSticker, setPlaceDraft])

  const retryPath = order?.kind === "restore" ? "/dashboard" : "/place"

  let content: React.ReactNode
  if (problem === "sign-in") {
    content = (
      <Notice
        tone="warning"
        title="Sign in to see your order"
        body="Use the account you paid with."
        action={
          <Link
            to="/sign-in"
            search={{ next: `/checkout/${orderId}` }}
            className="nk-btn"
          >
            Sign in
          </Link>
        }
      />
    )
  } else if (problem === "missing") {
    content = (
      <Notice
        tone="warning"
        title="We couldn\u2019t find this order"
        body="It may belong to another account."
        action={
          <Link to="/dashboard" className="nk-btn">
            Go to dashboard
          </Link>
        }
      />
    )
  } else if (fulfilled?.result) {
    const result = fulfilled.result
    const placement =
      result.kind === "restore" ? result.placements[0] : result.placement
    const copy = SUCCESS[result.kind]
    content = (
      <Notice
        tone="success"
        title={copy.title}
        body={`${copy.body} You paid $${fulfilled.amount.toLocaleString("en-US")}.`}
        extra={
          result.kind !== "place" && result.rank ? (
            <RankMove rank={result.rank} category={result.sticker.category} />
          ) : null
        }
        action={
          <>
            {placement ? (
              <button
                type="button"
                className="nk-btn"
                onClick={() => {
                  focusPlacement(placement)
                  void navigate({ to: "/" })
                }}
              >
                <MapPin weight="fill" className="size-4" />
                See it on the wall
              </button>
            ) : null}
            <Link
              to="/dashboard/stickers/$slug"
              params={{ slug: result.sticker.slug }}
              className="nk-btn-secondary"
            >
              Manage sticker
            </Link>
          </>
        }
      />
    )
  } else if (fulfilled) {
    content = (
      <Notice
        tone="success"
        title="Payment received"
        body="Your sticker is on the wall."
        action={
          <Link to="/dashboard" className="nk-btn">
            Go to dashboard
          </Link>
        }
      />
    )
  } else if (order?.status === "failed") {
    content = (
      <Notice
        tone="warning"
        title="We couldn\u2019t finish this"
        body={`${order.error ?? "The wall changed while you were paying."} Your payment is being refunded.`}
        action={
          <Link to="/dashboard" className="nk-btn">
            Go to dashboard
          </Link>
        }
      />
    )
  } else if (order?.paymentStatus && DEAD_PAYMENT.has(order.paymentStatus)) {
    content = (
      <Notice
        tone="warning"
        title="Payment didn\u2019t go through"
        body="You weren\u2019t charged. Your sticker is still waiting for you."
        action={
          <Link to={retryPath} className="nk-btn">
            Try again
          </Link>
        }
      />
    )
  } else if (problem === "slow") {
    content = (
      <Notice
        tone="neutral"
        title="Still waiting on the payment"
        body="Some payments take a few minutes to clear. Your sticker goes up as soon as it does, so check your dashboard soon."
        action={
          <Link to="/dashboard" className="nk-btn">
            Go to dashboard
          </Link>
        }
      />
    )
  } else {
    content = (
      <Notice
        tone="neutral"
        busy
        title="Confirming your payment"
        body="This takes a few seconds. Keep this page open."
      />
    )
  }

  return (
    <AppChrome>
      <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-16 text-center sm:pt-24">
        {content}
      </div>
    </AppChrome>
  )
}

function Notice({
  tone,
  busy,
  title,
  body,
  extra,
  action,
}: {
  tone: "success" | "warning" | "neutral"
  busy?: boolean
  title: string
  body: string
  extra?: React.ReactNode
  action?: React.ReactNode
}) {
  const Icon = busy
    ? CircleNotch
    : tone === "success"
      ? CheckCircle
      : WarningCircle
  return (
    <div className="flex flex-col items-center gap-5" aria-live="polite">
      <span
        className={
          tone === "success"
            ? "grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600"
            : tone === "warning"
              ? "grid size-16 place-items-center rounded-full bg-[#fff4d6] text-[#a15c00]"
              : "grid size-16 place-items-center rounded-full bg-black/[0.045] text-neutral-800"
        }
      >
        <Icon
          weight={busy ? "bold" : "fill"}
          className={busy ? "size-7 animate-spin" : "size-8"}
        />
      </span>
      <h1 className="text-[30px] font-semibold tracking-[-0.03em] text-neutral-900 sm:text-[34px]">
        {title}
      </h1>
      <p className="max-w-sm text-[15px] leading-relaxed text-neutral-500">
        {body}
      </p>
      {extra}
      {action ? (
        <div className="flex flex-wrap justify-center gap-2.5">{action}</div>
      ) : null}
    </div>
  )
}
