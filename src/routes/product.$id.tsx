import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { ArrowSquareOut, MapPin } from "@phosphor-icons/react"
import { AppChrome } from "@/components/layout/app-chrome"
import { Button, buttonVariants } from "@/components/ui/button"
import { getPublicProduct } from "@/lib/products"
import { cn } from "@/lib/utils"
import { useWallStore } from "@/store/wall-store"
import { useEffect } from "react"

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
        <p className="px-8 py-24 font-mono text-xs tracking-widest uppercase">
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
        <div className="mx-auto max-w-lg px-6 py-24 text-center">
          <h1 className="font-heading text-3xl font-extrabold">
            Product not found
          </h1>
          <Link
            to="/directory"
            className={cn(buttonVariants(), "mt-4 inline-flex rounded-2xl")}
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
      <div className="mx-auto grid max-w-4xl gap-8 px-4 py-10 sm:px-8 lg:grid-cols-[200px_1fr]">
        <div className="flex justify-center lg:justify-start">
          {heroSrc ? (
            <img
              src={heroSrc}
              alt={product.name}
              className="max-h-52 object-contain drop-shadow-xl"
            />
          ) : (
            <div className="size-40 rounded-3xl bg-muted" />
          )}
        </div>
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            {product.category}
          </p>
          <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
            {product.name}
          </h1>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">
            {product.oneLiner}
          </p>
          {product.offer ? (
            <p className="mt-3 font-mono text-xs tracking-wide text-sticker-teal uppercase">
              {product.offer}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={product.url}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants(), "rounded-2xl")}
            >
              Visit website
              <ArrowSquareOut weight="bold" data-icon="inline-end" />
            </a>
            {latest ? (
              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => {
                  focusPlacement(latest, 2.6)
                  void navigate({ to: "/" })
                }}
              >
                <MapPin weight="bold" data-icon="inline-start" />
                Jump to wall
              </Button>
            ) : null}
          </div>

          {dbProduct && dbProduct.stickers.length > 0 ? (
            <section className="mt-10">
              <h2 className="font-heading text-xl font-extrabold">Stickers</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Stickers attached to this product in the maker directory.
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {dbProduct.stickers.map((sticker) => (
                  <li
                    key={sticker.id}
                    className="flex flex-col items-center rounded-2xl border border-border bg-card/80 px-3 py-4"
                  >
                    <img
                      src={sticker.imageUrl}
                      alt=""
                      className="max-h-28 object-contain drop-shadow-md"
                    />
                    <span className="mt-3 font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                      {sticker.style}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-10">
            <h2 className="font-heading text-xl font-extrabold">Placements</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Each payment creates a new layer. Older placements stay in history.
            </p>
            <ul className="mt-4 divide-y divide-border rounded-2xl border border-border">
              {placements.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span className="font-mono text-xs tracking-wider uppercase">
                    {p.sizeTier} · z{p.zIndex} · ({Math.round(p.x)},{" "}
                    {Math.round(p.y)})
                  </span>
                  <Button
                    size="xs"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => {
                      focusPlacement(p, 2.6)
                      void navigate({ to: "/" })
                    }}
                  >
                    View
                  </Button>
                </li>
              ))}
              {placements.length === 0 ? (
                <li className="px-4 py-6 text-sm text-muted-foreground">
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
