import { useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { MagnifyingGlass } from "@phosphor-icons/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CATEGORIES, type Category } from "@/domain/types"
import type { ProductDTO, StickerDTO } from "@/lib/product-api"
import { cn } from "@/lib/utils"

type DirectoryProduct = ProductDTO & { stickers: StickerDTO[] }

export function DirectoryList({ products }: { products: DirectoryProduct[] }) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<Category | "All">("All")

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products
      .filter((p) => (category === "All" ? true : p.category === category))
      .filter(
        (p) =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          p.oneLiner.toLowerCase().includes(q)
      )
      .map((product) => ({
        product,
        sticker: product.stickers[0],
      }))
  }, [products, query, category])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8">
      <header className="flex flex-col gap-3">
        <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          Permanent layer
        </p>
        <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
          Maker directory
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Wall visibility is temporary. Product existence is permanent — even
          when a sticker is buried.
        </p>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlass className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="rounded-xl border border-input bg-card px-3 pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["All", ...CATEGORIES] as const).map((c) => (
            <Button
              key={c}
              type="button"
              size="xs"
              variant={category === c ? "default" : "outline"}
              className="rounded-lg"
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-border rounded-3xl border border-border bg-card/80">
        {rows.map(({ product, sticker }) => (
          <li key={product.id}>
            <Link
              to="/product/$id"
              params={{ id: product.id }}
              className="flex items-center gap-4 px-4 py-4 transition-colors hover:bg-muted/50 sm:px-5"
            >
              {sticker ? (
                <img
                  src={sticker.imageUrl}
                  alt=""
                  className="size-14 shrink-0 object-contain sm:size-16"
                />
              ) : (
                <div className="size-14 shrink-0 rounded-xl bg-muted sm:size-16" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h2 className="font-heading text-xl font-extrabold tracking-tight">
                    {product.name}
                  </h2>
                  <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                    {product.category}
                    {product.stickerCount
                      ? ` · ${product.stickerCount} sticker${product.stickerCount === 1 ? "" : "s"}`
                      : ""}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {product.oneLiner}
                </p>
              </div>
              <span
                className={cn(
                  "hidden font-mono text-[10px] tracking-widest uppercase sm:inline",
                  "text-sticker-teal"
                )}
              >
                View
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="px-5 py-10 text-center text-sm text-muted-foreground">
            No products match.
          </li>
        ) : null}
      </ul>
    </div>
  )
}
