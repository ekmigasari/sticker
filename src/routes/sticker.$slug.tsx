import { useEffect, useMemo } from "react"
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
} from "@tanstack/react-router"
import { ArrowSquareOut, MapPin } from "@phosphor-icons/react"
import { AppChrome } from "@/components/layout/app-chrome"
import { formatPlot } from "@/domain/types"
import { getPublicSticker } from "@/lib/stickers"
import { useWallStore } from "@/store/wall-store"

export const Route = createFileRoute("/sticker/$slug")({
  loader: async ({ params }) => {
    const sticker = await getPublicSticker({ data: params.slug })
    if (sticker && sticker.slug !== params.slug) {
      throw redirect({
        to: "/sticker/$slug",
        params: { slug: sticker.slug },
      })
    }
    return sticker
  },
  component: StickerPage,
})

function StickerPage() {
  const { slug } = Route.useParams()
  const dbSticker = Route.useLoaderData()
  const navigate = useNavigate()
  const hydrate = useWallStore((s) => s.hydrate)
  const hydrated = useWallStore((s) => s.hydrated)
  const stickers = useWallStore((s) => s.stickers)
  const allPlacements = useWallStore((s) => s.placements)
  const focusPlacement = useWallStore((s) => s.focusPlacement)

  const localSticker = useMemo(
    () => stickers.find((s) => s.slug === slug || s.id === slug),
    [stickers, slug]
  )
  const stickerKey = dbSticker?.id ?? localSticker?.id ?? slug
  const placements = useMemo(
    () =>
      allPlacements
        .filter((p) => p.stickerId === stickerKey)
        .sort((a, b) => b.zIndex - a.zIndex),
    [allPlacements, stickerKey]
  )

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!dbSticker && !hydrated) {
    return (
      <AppChrome>
        <p className="font-ui px-8 py-24 text-[15px] text-neutral-500">
          Loading…
        </p>
      </AppChrome>
    )
  }

  const sticker = dbSticker
    ? {
        name: dbSticker.name,
        oneLiner: dbSticker.oneLiner,
        url: dbSticker.url,
        category: dbSticker.category,
        offer: dbSticker.offer,
        imageSrc: dbSticker.imageUrl,
      }
    : localSticker
      ? {
          name: localSticker.name,
          oneLiner: localSticker.oneLiner,
          url: localSticker.url,
          category: localSticker.category,
          offer: localSticker.offer,
          imageSrc: localSticker.imageDataUrl,
        }
      : null

  if (!sticker) {
    return (
      <AppChrome>
        <div className="font-ui mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-neutral-900">
            Sticker not found
          </h1>
          <Link
            to="/directory"
            className="press mt-6 inline-flex h-11 items-center rounded-full bg-neutral-900 px-6 text-[15px] font-semibold text-white"
          >
            Back to directory
          </Link>
        </div>
      </AppChrome>
    )
  }

  const latest = placements[0]

  return (
    <AppChrome>
      <div className="font-ui mx-auto grid max-w-4xl gap-10 px-4 py-12 sm:px-8 lg:grid-cols-[200px_1fr]">
        <div className="flex justify-center lg:justify-start">
          {sticker.imageSrc ? (
            <img
              src={sticker.imageSrc}
              alt={sticker.name}
              className="max-h-52 object-contain drop-shadow-xl"
            />
          ) : (
            <div className="size-40 rounded-[28px] bg-[#f5f5f7]" />
          )}
        </div>
        <div>
          <p className="text-[13px] font-medium tracking-[-0.01em] text-neutral-500">
            {sticker.category}
          </p>
          <h1 className="mt-1 text-[40px] leading-none font-semibold tracking-[-0.035em] text-neutral-900 sm:text-[48px]">
            {sticker.name}
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-snug text-neutral-500">
            {sticker.oneLiner}
          </p>
          {sticker.offer ? (
            <p className="mt-3 text-[14px] font-medium tracking-[-0.01em] text-neutral-700">
              {sticker.offer}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={sticker.url}
              target="_blank"
              rel="noreferrer"
              className="press inline-flex h-11 items-center gap-1.5 rounded-full bg-neutral-900 px-5 text-[15px] font-semibold tracking-[-0.01em] text-white"
            >
              Visit website
              <ArrowSquareOut weight="bold" className="size-4" />
            </a>
            {latest ? (
              <button
                type="button"
                className="press inline-flex h-11 items-center gap-1.5 rounded-full bg-black/[0.06] px-5 text-[15px] font-semibold tracking-[-0.01em] text-neutral-900 transition-colors hover:bg-black/[0.09]"
                onClick={() => {
                  focusPlacement(latest, 2.6)
                  void navigate({ to: "/" })
                }}
              >
                <MapPin weight="bold" className="size-4" />
                Jump to wall
              </button>
            ) : null}
          </div>

          <section className="mt-12">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-neutral-900">
              Placements
            </h2>
            <p className="mt-1 text-[14px] text-neutral-500">
              Each payment creates a new layer on the wall.
            </p>
            <ul className="mt-5 divide-y divide-black/[0.06]">
              {placements.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-3.5 text-[14px]"
                >
                  <span className="text-neutral-600">
                    {formatPlot(p.unitsW, p.unitsH)} · z{p.zIndex} · (
                    {Math.round(p.x)}, {Math.round(p.y)})
                  </span>
                  <button
                    type="button"
                    className="press rounded-full bg-black/[0.045] px-3.5 py-1.5 text-[13px] font-medium text-neutral-800 transition-colors hover:bg-black/[0.07]"
                    onClick={() => {
                      focusPlacement(p, 2.6)
                      void navigate({ to: "/" })
                    }}
                  >
                    View
                  </button>
                </li>
              ))}
              {placements.length === 0 ? (
                <li className="py-8 text-[14px] text-neutral-500">
                  No wall placements yet.
                </li>
              ) : null}
            </ul>
          </section>
        </div>
      </div>
    </AppChrome>
  )
}
