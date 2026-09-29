import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Link, useNavigate } from "@tanstack/react-router"
import { CheckCircle, CurrencyDollar } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { BrandMark, SiteNav } from "@/components/layout/site-nav"
import { StickerWall } from "@/components/wall/sticker-wall"
import {
  CATEGORIES,
  SIZE_TIERS,
  WALL_SIZE,
  type Category,
  type SizeTier,
  sizePx,
} from "@/domain/types"
import { cn } from "@/lib/utils"
import { publishPlaceListing } from "@/lib/place-publish"
import { isValidStickerUrl } from "@/lib/sticker-meta"
import { useWallStore } from "@/store/wall-store"

function PlaceChrome({ children }: { children: ReactNode }) {
  return (
    <div className="font-ui min-h-svh bg-white text-neutral-900 antialiased">
      <div className="sticky top-0 z-40 border-b border-black/[0.06] bg-white/80 px-3 py-3 backdrop-blur-xl backdrop-saturate-150 sm:px-5">
        <div className="flex h-8 items-center justify-between gap-3">
          <BrandMark />
          <SiteNav className="hidden sm:flex" />
        </div>
      </div>
      {children}
    </div>
  )
}

type Step = "details" | "pay" | "place" | "done"

export function PlaceFlow() {
  const navigate = useNavigate()
  const draftSticker = useWallStore((s) => s.draftSticker)
  const setDraftSticker = useWallStore((s) => s.setDraftSticker)
  const setPlaceDraft = useWallStore((s) => s.setPlaceDraft)
  const confirmPlacement = useWallStore((s) => s.confirmPlacement)
  const hydrate = useWallStore((s) => s.hydrate)

  const [step, setStep] = useState<Step>("details")
  const [tier, setTier] = useState<SizeTier>("M")
  const [name, setName] = useState("")
  const [oneLiner, setOneLiner] = useState("")
  const [url, setUrl] = useState("")
  const [category, setCategory] = useState<Category>("Developer Tools")
  const [offer, setOffer] = useState("")
  const [paying, setPaying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedSlug, setSavedSlug] = useState<string | null>(null)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const price = SIZE_TIERS[tier].price
  const dim = sizePx(tier)

  const canContinue = useMemo(
    () =>
      name.trim().length > 1 &&
      oneLiner.trim().length > 3 &&
      isValidStickerUrl(url),
    [name, oneLiner, url]
  )

  function goPay() {
    if (!draftSticker) return
    setPlaceDraft({
      sticker: draftSticker,
      sizeTier: tier,
      details: {
        name: name.trim(),
        oneLiner: oneLiner.trim(),
        url: url.trim(),
        category,
        offer: offer.trim() || undefined,
      },
    })
    setStep("pay")
  }

  function mockPay() {
    setPaying(true)
    window.setTimeout(() => {
      setPaying(false)
      setStep("place")
    }, 900)
  }

  async function onPlace(x: number, y: number) {
    if (!draftSticker || saving) return
    const draft = useWallStore.getState().placeDraft
    if (!draft) return

    setSaving(true)
    setSaveError(null)
    try {
      const published = await publishPlaceListing({
        details: draft.details,
        sticker: draft.sticker,
      })
      const placement = confirmPlacement(x, y, {
        stickerId: published.stickerId,
        slug: published.slug,
      })
      if (!placement) {
        throw new Error("Could not place sticker on the wall.")
      }
      setSavedSlug(published.slug)
      setStep("done")
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save sticker."
      )
    } finally {
      setSaving(false)
    }
  }

  // confirmPlacement clears draftSticker — check done before the empty state.
  if (step === "done") {
    return (
      <PlaceChrome>
        <div className="mx-auto flex max-w-lg flex-col items-center gap-5 px-6 py-24 text-center">
          <CheckCircle weight="fill" className="size-14 text-neutral-900" />
          <h1 className="text-[36px] font-semibold tracking-[-0.03em] text-neutral-900">
            You&apos;re on the wall
          </h1>
          <p className="text-[16px] leading-relaxed text-neutral-500">
            Your placement is permanent. Newer stickers can cover it — that&apos;s
            the game. Your sticker is in the directory either way.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              className="press inline-flex h-11 items-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white"
              onClick={() => {
                setDraftSticker(null)
                void navigate({ to: "/" })
              }}
            >
              See the wall
            </button>
            {savedSlug ? (
              <Link
                to="/sticker/$slug"
                params={{ slug: savedSlug }}
                className="press inline-flex h-11 items-center rounded-full bg-black/[0.06] px-6 text-[15px] font-semibold text-neutral-900"
                onClick={() => setDraftSticker(null)}
              >
                View listing
              </Link>
            ) : (
              <Link
                to="/directory"
                className="press inline-flex h-11 items-center rounded-full bg-black/[0.06] px-6 text-[15px] font-semibold text-neutral-900"
                onClick={() => setDraftSticker(null)}
              >
                Open directory
              </Link>
            )}
          </div>
        </div>
      </PlaceChrome>
    )
  }

  if (step === "place" && draftSticker) {
    return (
      <div className="font-ui relative">
        <div className="pointer-events-none absolute top-3 right-3 left-3 z-30 flex justify-center sm:top-4">
          <div className="pointer-events-auto rounded-full border border-black/[0.06] bg-white/85 px-5 py-3 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
            <p className="text-center text-[15px] font-semibold tracking-[-0.01em] text-neutral-900">
              {saving
                ? "Saving your sticker…"
                : `Tap the wall to place your ${tier} sticker`}
            </p>
            <p className="text-center text-[12px] text-neutral-500">
              {dim}×{dim} · ${price} paid (prototype)
            </p>
            {saveError ? (
              <p
                role="alert"
                className="mt-2 text-center text-[12px] font-medium text-red-600"
              >
                {saveError}
              </p>
            ) : null}
          </div>
        </div>
        <StickerWall
          placeMode={!saving}
          ghostSize={dim}
          onPlace={(x, y) => void onPlace(x, y)}
        />
        <img
          src={draftSticker.imageDataUrl}
          alt=""
          className="pointer-events-none fixed right-4 bottom-4 z-30 size-16 object-contain opacity-90 drop-shadow-lg sm:size-20"
        />
      </div>
    )
  }

  if (!draftSticker) {
    return (
      <PlaceChrome>
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-6 py-24 text-center">
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-neutral-900">
            No sticker yet
          </h1>
          <p className="text-[16px] text-neutral-500">
            Make a sticker first, then come back to place it on the wall.
          </p>
          <Link
            to="/make"
            className="press inline-flex h-11 items-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white"
          >
            Create sticker
          </Link>
        </div>
      </PlaceChrome>
    )
  }

  return (
    <PlaceChrome>
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div className="flex flex-col items-center gap-4 rounded-[28px] border border-black/[0.06] bg-[#f5f5f7] p-6">
          <img
            src={draftSticker.imageDataUrl}
            alt="Your sticker"
            className="max-h-64 object-contain drop-shadow-xl"
          />
          <p className="text-[12px] font-medium tracking-[-0.01em] text-neutral-500">
            Placement size preview on a {WALL_SIZE}×{WALL_SIZE} wall
          </p>
          <div className="relative h-40 w-full max-w-xs overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
            <div className="wall-grid absolute inset-0 opacity-50" />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border-2 border-dashed border-neutral-900/25 bg-white/40"
              style={{
                width: `${(dim / WALL_SIZE) * 100}%`,
                height: `${(dim / WALL_SIZE) * 100}%`,
                minWidth: 28,
                minHeight: 28,
              }}
            >
              <img
                src={draftSticker.imageDataUrl}
                alt=""
                className="size-full object-contain"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-black/[0.06] bg-white p-5 sm:p-6">
          {step === "details" ? (
            <div className="flex flex-col gap-5">
              <div>
                <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-neutral-900">
                  Sticker details
                </h1>
                <p className="mt-2 text-[14px] leading-relaxed text-neutral-500">
                  Your sticker is the product — title, short description, link,
                  and category go into the directory forever.
                </p>
              </div>

              <div className="space-y-2">
                <span className="nk-label">Size</span>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(SIZE_TIERS) as SizeTier[]).map((key) => {
                    const s = SIZE_TIERS[key]
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setTier(key)}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-left transition-colors",
                          tier === key
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-black/[0.08] bg-[#f5f5f7] hover:bg-black/[0.04]"
                        )}
                      >
                        <div className="text-[17px] font-semibold tracking-[-0.02em]">
                          {s.key}
                        </div>
                        <div className="text-[11px] opacity-80">
                          {s.units}×{s.units} · ${s.price}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="name" className="nk-label">
                  Title
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ShipKit"
                  className="nk-field"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="blurb" className="nk-label">
                  Short description
                </label>
                <textarea
                  id="blurb"
                  value={oneLiner}
                  onChange={(e) => setOneLiner(e.target.value)}
                  placeholder="Launch checklists that actually get checked."
                  className="nk-textarea"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="url" className="nk-label">
                  Link
                </label>
                <input
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://yourproduct.dev"
                  className="nk-field"
                />
                {url.trim() && !isValidStickerUrl(url) ? (
                  <p className="text-[12px] font-medium text-red-600">
                    Enter a full website link (e.g. https://yoursite.com).
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <span className="nk-label">Category</span>
                <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCategory(c)}
                      className={cn(
                        "nk-chip",
                        category === c ? "nk-chip-active" : "nk-chip-idle"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label htmlFor="offer" className="nk-label">
                  Offer / launch line{" "}
                  <span className="text-neutral-400">(optional)</span>
                </label>
                <input
                  id="offer"
                  value={offer}
                  onChange={(e) => setOffer(e.target.value)}
                  placeholder="Launch week: 30% off"
                  className="nk-field"
                />
              </div>

              <button
                type="button"
                className="nk-btn mt-2 w-full"
                disabled={!canContinue}
                onClick={goPay}
              >
                Continue to pay · ${price}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-5">
              <div>
                <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-neutral-900">
                  Pay ${price}
                </h1>
                <p className="mt-2 max-w-md text-[14px] leading-relaxed text-neutral-500">
                  You&apos;re buying a <strong>{tier}</strong> placement on the
                  wall, not a permanent plot. Mock payment for this prototype.
                </p>
              </div>
              <div className="w-full rounded-2xl border border-black/[0.06] bg-[#f5f5f7] p-4 text-[14px]">
                <div className="flex justify-between text-neutral-600">
                  <span>{name || "Your sticker"}</span>
                  <span>
                    {SIZE_TIERS[tier].units}×{SIZE_TIERS[tier].units}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-[22px] font-semibold tracking-[-0.02em] text-neutral-900">
                  <span>Total</span>
                  <span>${price}</span>
                </div>
              </div>
              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1 rounded-full"
                  size="lg"
                  disabled={paying}
                  onClick={mockPay}
                >
                  <CurrencyDollar weight="bold" data-icon="inline-start" />
                  {paying ? "Processing…" : `Pay $${price}`}
                </Button>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setStep("details")}
                >
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PlaceChrome>
  )
}
