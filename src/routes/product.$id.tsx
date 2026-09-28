import { useEffect } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowSquareOut, MapPin } from "@phosphor-icons/react"
import { AppChrome } from "@/components/layout/app-chrome"
import { getPublicProduct } from "@/lib/products"
import { useWallStore } from "@/store/wall-store"

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => getPublicProduct({ data: params.id }),
  component: ProductPage,
})

function ProductPage() {
  const { id } = Route.useParams()
  const dbProduct = Route.useLoaderData()
  const navigate = useNavigate()
  const hydrate = useWallStore((s) => s.hydrate)
  const hydrated = useWallStore((s) => s.hydrated)
  const localProduct = useWallStore((s) => s.getProduct(id))
  const placements = useWallStore((s) =>
    s.placements
      .filter((p) => p.productId === id)
      .sort((a, b) => b.zIndex - a.zIndex)
  )
  const stickers = useWallStore((s) => s.stickers)
  const focusPlacement = useWallStore((s) => s.focusPlacement)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  if (!dbProduct && !hydrated) {
    return (
      <AppChrome>
        <p className="font-ui px-8 py-24 text-[15px] text-neutral-500">
          Loading…
        </p>
      </AppChrome>
    )
  }

  const product = dbProduct
    ? {
        name: dbProduct.name,
        oneLiner: dbProduct.oneLiner,
        url: dbProduct.url,
        category: dbProduct.category,
        offer: dbProduct.offer,
      }
    : localProduct

  if (!product) {
    return (
      <AppChrome>
        <div className="font-ui mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="text-[32px] font-semibold tracking-[-0.03em] text-neutral-900">
            Product not found
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
  const localSticker = latest
    ? stickers.find((s) => s.id === latest.stickerId)
    : undefined
  const dbSticker = dbProduct?.stickers[0]
  const heroSrc = dbSticker?.imageUrl ?? localSticker?.imageDataUrl

  return (
    <AppChrome>
      <div className="font-ui mx-auto grid max-w-4xl gap-10 px-4 py-12 sm:px-8 lg:grid-cols-[200px_1fr]">
        <div className="flex justify-center lg:justify-start">
          {heroSrc ? (
            <img
              src={heroSrc}
              alt={product.name}
              className="max-h-52 object-contain drop-shadow-xl"
            />
          ) : (
            <div className="size-40 rounded-[28px] bg-[#f5f5f7]" />
          )}
        </div>
        <div>
          <p className="text-[13px] font-medium tracking-[-0.01em] text-neutral-500">
            {product.category}
          </p>
          <h1 className="mt-1 text-[40px] leading-none font-semibold tracking-[-0.035em] text-neutral-900 sm:text-[48px]">
            {product.name}
          </h1>
          <p className="mt-4 max-w-xl text-[17px] leading-snug text-neutral-500">
            {product.oneLiner}
          </p>
          {product.offer ? (
            <p className="mt-3 text-[14px] font-medium tracking-[-0.01em] text-neutral-700">
              {product.offer}
            </p>
          ) : null}

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href={product.url}
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

          {dbProduct && dbProduct.stickers.length > 0 ? (
            <section className="mt-12">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-neutral-900">
                Stickers
              </h2>
              <p className="mt-1 text-[14px] text-neutral-500">
                Stickers attached to this product in the maker directory.
              </p>
              <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {dbProduct.stickers.map((sticker) => (
                  <li
                    key={sticker.id}
                    className="flex flex-col items-center rounded-[22px] border border-black/[0.06] bg-[#f5f5f7] px-3 py-4"
                  >
                    <img
                      src={sticker.imageUrl}
                      alt=""
                      className="max-h-28 object-contain drop-shadow-md"
                    />
                    <span className="mt-3 text-[12px] font-medium tracking-[-0.01em] text-neutral-500">
                      {sticker.style}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-12">
            <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-neutral-900">
              Placements
            </h2>
            <p className="mt-1 text-[14px] text-neutral-500">
              Each payment creates a new layer. Older placements stay in history.
            </p>
            <ul className="mt-5 divide-y divide-black/[0.06]">
              {placements.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-3.5 text-[14px]"
                >
                  <span className="text-neutral-600">
                    {p.sizeTier} · z{p.zIndex} · ({Math.round(p.x)},{" "}
                    {Math.round(p.y)})
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
