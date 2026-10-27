import { createFileRoute, Link } from "@tanstack/react-router"
import {
  ArrowUp,
  GridFour,
  Lightbulb,
  MagicWand,
  MapPinPlus,
  Stack,
  Storefront,
  Trophy,
  type Icon,
} from "@phosphor-icons/react"
import { AppChrome } from "@/components/layout/app-chrome"
import { VISIBILITY } from "@/components/stickers/wall-status"
import {
  PLOT_MAX,
  PLOT_MIN,
  RESTORE_MIN_PRICE,
  WALL_UNITS,
  formatPlot,
  plotPrice,
  type PlotVisibility,
} from "@/domain/types"
import { seo } from "@/lib/seo"

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: seo({
      title: "Rules",
      description:
        "One wall. Newest sticker on top. $1 per unit. Here's how it works.",
    }),
  }),
  component: RulesPage,
})

const usd = (n: number) => `$${n.toLocaleString("en-US")}`

const PRICE_EXAMPLES: [number, number][] = [
  [PLOT_MIN, PLOT_MIN],
  [5, 5],
  [10, 10],
  [16, 9],
  [PLOT_MAX, PLOT_MAX],
]

const VISIBILITY_RULES: { level: PlotVisibility; body: string }[] = [
  { level: "visible", body: "Nothing on top of it." },
  { level: "partly", body: "Half or more still shows." },
  { level: "mostly", body: "Less than half still shows." },
  {
    level: "hidden",
    body: "Not drawn on the wall, but it keeps its spot and its listing.",
  },
]

function RulesPage() {
  return (
    <AppChrome>
      <div className="nk-page max-w-2xl">
        <header className="flex flex-col gap-3">
          <p className="text-[13px] font-semibold tracking-[-0.01em] text-[#0071e3]">
            How the wall works
          </p>
          <h1 className="nk-title">Rules</h1>
          <p className="nk-subtitle">
            One shared wall, {WALL_UNITS.toLocaleString("en-US")} ×{" "}
            {WALL_UNITS.toLocaleString("en-US")} units. Anyone can stick
            anything anywhere. The newest sticker is always on top.
          </p>
        </header>

        <ol className="flex flex-col gap-3">
          <Rule n={1} icon={Lightbulb} title="Stick up the thing you made">
            <p>
              Make a sticker for your product, service, personal brand, or
              anything else you&apos;re behind.
            </p>
            <p className="mt-3">
              Some things aren&apos;t allowed, like adult content, gambling,
              alcohol and tobacco. See the{" "}
              <Link
                to="/terms"
                className="font-medium text-[#0071e3] hover:underline"
              >
                Terms and Conditions
              </Link>
              .
            </p>
          </Rule>

          <Rule n={2} icon={MagicWand} title="Making a sticker is free">
            <p>
              Upload any image and turn it into a sticker: cut it out, pick an
              outline and shape, add a filter or a finish like glitter or
              hologram. Making and downloading it is free, and you don&apos;t
              need an account.
            </p>
          </Rule>

          <Rule n={3} icon={GridFour} title="You buy a spot, $1 per unit">
            <p>
              To put a sticker on the wall you buy a spot: a rectangle of whole
              units. Every unit costs $1, so a spot&apos;s price is its width ×
              height. Payments are one-time. There are no subscriptions and
              spots never expire.
            </p>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {PRICE_EXAMPLES.map(([w, h]) => (
                <li
                  key={`${w}x${h}`}
                  className="rounded-[14px] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                >
                  <p className="text-[13px] text-neutral-500 tabular-nums">
                    {formatPlot(w, h)}
                  </p>
                  <p className="text-[17px] font-semibold tracking-[-0.02em] text-neutral-900 tabular-nums">
                    {usd(plotPrice(w, h))}
                  </p>
                </li>
              ))}
            </ul>
            <ul className="mt-3 list-disc space-y-1 pl-5 marker:text-neutral-300">
              <li>
                Smallest spot is {formatPlot(PLOT_MIN, PLOT_MIN)}. Each side can
                be up to {PLOT_MAX} units.
              </li>
              <li>A spot can&apos;t be stretched longer than 16:9.</li>
              <li>
                Place it anywhere on the wall, including on top of other
                stickers.
              </li>
              <li>
                Your artwork can be sized and rotated freely inside the spot.
                You pay for the spot, not the artwork.
              </li>
              <li>You need an account to place a sticker.</li>
            </ul>
          </Rule>

          <Rule n={4} icon={Stack} title="Newest is always on top">
            <p>
              Every new spot goes on top of everything already on the wall. If
              it overlaps older stickers, it covers them. That&apos;s the game:
              your sticker can be covered too.
            </p>
            <p className="mt-2">
              Covering is measured by spot area, not by the shape of the art.
              Each spot shows how much of it is still visible:
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {VISIBILITY_RULES.map(({ level, body }) => (
                <li key={level} className="flex items-baseline gap-2.5">
                  <span
                    aria-hidden
                    className={`size-2 shrink-0 translate-y-[-1px] rounded-full ${VISIBILITY[level].dot}`}
                  />
                  <span>
                    <span className="font-semibold text-neutral-900">
                      {VISIBILITY[level].label}.
                    </span>{" "}
                    {body}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              If the stickers on top move away, whatever was under them shows
              again.
            </p>
          </Rule>

          <Rule n={5} icon={ArrowUp} title="Restore to get back on top">
            <p>
              Covered? Restore puts your spot back on top in the same place, at
              the same size. You only pay for the covered part: $1 per covered
              unit, with a minimum of {usd(RESTORE_MIN_PRICE)} per spot. The
              part that still shows is free.
            </p>
            <p className="mt-2">
              If the wall changes while you&apos;re checking out, you&apos;ll
              see the new price before you pay.
            </p>
          </Rule>

          <Rule n={6} icon={MapPinPlus} title="Or buy a new spot">
            <p>
              Want a different place or size? Buy a new spot anywhere, at any
              size, at the full $1-per-unit price. It goes on top of everything.
            </p>
            <p className="mt-2">
              Once you pay, your old spot comes off the wall for good. Anything
              it was covering shows again. What you paid for the old spot still
              counts toward your total.
            </p>
          </Rule>

          <Rule n={7} icon={Trophy} title="Rankings follow the money">
            <p>
              Stickers are ranked by how much they&apos;ve spent on the wall in
              total: every spot, restore and new spot adds up. There&apos;s an
              overall leaderboard and one per category. If two stickers have
              spent the same, the one listed first ranks higher.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 marker:text-neutral-300">
              <li>A sticker is ranked once it has paid for its first spot.</li>
              <li>
                Rank comes from spend, not visibility. Getting covered
                doesn&apos;t lower your rank, but it does hide you from people
                looking at the wall.
              </li>
            </ul>
          </Rule>

          <Rule n={8} icon={Storefront} title="Every sticker gets a listing">
            <p>
              Each sticker gets its own page in{" "}
              <Link
                to="/stickers"
                className="font-medium text-[#0071e3] hover:underline"
              >
                Stickers
              </Link>{" "}
              with a title, short description, link and category. You can add a
              longer description and a promo, too. The listing stays even when
              the sticker is 100% covered on the wall.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 marker:text-neutral-300">
              <li>
                You can edit your details any time from your Sticker Book.
              </li>
              <li>
                A promo with an end date disappears from your listing after that
                day.
              </li>
              <li>
                Archiving a sticker hides it from the directory and rankings.
                Its spots stay on the wall, and you can unarchive it any time.
                Unarchive it before restoring or moving it.
              </li>
            </ul>
          </Rule>
        </ol>

        <div className="flex flex-col gap-2.5 sm:flex-row">
          <Link to="/make" className="nk-btn">
            <MagicWand weight="bold" className="size-4" />
            Make a sticker
          </Link>
          <Link to="/" className="nk-btn-secondary">
            See the wall
          </Link>
        </div>
      </div>
    </AppChrome>
  )
}

function Rule({
  n,
  icon: Icon,
  title,
  children,
}: {
  n: number
  icon: Icon
  title: string
  children: React.ReactNode
}) {
  return (
    <li className="rounded-[24px] bg-[#f5f5f7] p-5 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-white text-neutral-800 shadow-[0_1px_2px_rgba(0,0,0,0.06),0_4px_12px_-6px_rgba(0,0,0,0.12)]">
          <Icon weight="bold" className="size-5" />
        </span>
        <h2 className="text-[20px] leading-tight font-semibold tracking-[-0.025em] text-neutral-900">
          <span className="mr-1.5 text-[#0071e3] tabular-nums">{n}.</span>
          {title}
        </h2>
      </div>
      <div className="mt-3 text-[15px] leading-relaxed tracking-[-0.01em] text-neutral-600">
        {children}
      </div>
    </li>
  )
}
