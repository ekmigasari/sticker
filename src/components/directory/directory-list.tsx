import { useMemo, useState } from "react"
import { Link } from "@tanstack/react-router"
import { MagnifyingGlass } from "@phosphor-icons/react"
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
    <div className="font-ui mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-8 sm:py-14">
      <header className="flex flex-col items-start gap-3">
        <h1 className="text-[40px] leading-none font-semibold tracking-[-0.035em] text-neutral-900 sm:text-[48px]">
          Directory
        </h1>
        <p className="max-w-xl text-[17px] leading-snug text-neutral-500">
          Every product stays here permanently, even when its sticker is buried
          on the wall.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <MagnifyingGlass
            weight="bold"
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products"
            className="h-12 w-full rounded-full border border-black/[0.06] bg-[#f5f5f7] pr-4 pl-11 text-[15px] tracking-[-0.01em] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-black/15 focus:bg-white"
          />
        </div>
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {(["All", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={cn(
                "press shrink-0 rounded-full px-4 py-2 text-[13px] font-medium tracking-[-0.01em] transition-colors",
                category === c
                  ? "bg-neutral-900 text-white"
                  : "bg-black/[0.045] text-neutral-600 hover:bg-black/[0.07] hover:text-neutral-900"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-black/[0.06]">
        {rows.map(({ product, sticker }) => (
          <li key={product.id}>
            <Link
              to="/product/$id"
              params={{ id: product.id }}
              className="group flex items-center gap-4 py-4 transition-opacity hover:opacity-80 sm:gap-5"
            >
              {sticker ? (
                <img
                  src={sticker.imageUrl}
                  alt=""
                  className="size-14 shrink-0 object-contain sm:size-16"
                />
              ) : (
                <div className="size-14 shrink-0 rounded-[18px] bg-[#f5f5f7] sm:size-16" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-neutral-900 sm:text-[19px]">
                    {product.name}
                  </h2>
                  <span className="text-[12px] font-medium tracking-[-0.01em] text-neutral-400">
                    {product.category}
                    {product.stickerCount
                      ? ` · ${product.stickerCount} sticker${product.stickerCount === 1 ? "" : "s"}`
                      : ""}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[14px] text-neutral-500">
                  {product.oneLiner}
                </p>
              </div>
              <span className="hidden text-[13px] font-medium tracking-[-0.01em] text-neutral-400 transition-colors group-hover:text-neutral-900 sm:inline">
                View
              </span>
            </Link>
          </li>
        ))}
        {rows.length === 0 ? (
          <li className="py-16 text-center text-[15px] text-neutral-500">
            No products match.
          </li>
        ) : null}
      </ul>
    </div>
  )
}
