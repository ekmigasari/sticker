import { Link, useRouter } from "@tanstack/react-router"
import { ArrowLeft, Plus, Trash, ArrowSquareOut } from "@phosphor-icons/react"
import { motion } from "motion/react"
import type { ProductDTO, StickerDTO } from "@/lib/product-api"
import { useState } from "react"

export function ProductManage({
  product,
  stickers: initialStickers,
}: {
  product: ProductDTO
  stickers: StickerDTO[]
}) {
  const router = useRouter()
  const [stickers, setStickers] = useState(initialStickers)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function deleteSticker(sticker: StickerDTO) {
    if (!window.confirm("Remove this artwork from the sticker?")) return
    setBusyId(sticker.id)
    const response = await fetch(`/api/stickers/${sticker.id}`, {
      method: "DELETE",
    })
    setBusyId(null)
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      window.alert(payload?.error ?? "Could not delete artwork.")
      return
    }
    setStickers((prev) => prev.filter((s) => s.id !== sticker.id))
    await router.invalidate()
  }

  return (
    <div className="nk-page">
      <div>
        <Link
          to="/dashboard"
          className="press inline-flex items-center gap-1.5 text-[13px] font-medium tracking-[-0.01em] text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft weight="bold" className="size-3.5" />
          Your stickers
        </Link>
        <p className="nk-label mt-5">{product.category}</p>
        <h1 className="nk-title mt-2">{product.name}</h1>
        <p className="nk-subtitle mt-3">{product.oneLiner}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/make"
            search={{ productId: product.id }}
            className="nk-btn"
          >
            <Plus weight="bold" className="size-4" />
            Add artwork
          </Link>
          <Link
            to="/product/$id"
            params={{ id: product.id }}
            className="nk-btn-secondary"
          >
            View public page
            <ArrowSquareOut weight="bold" className="size-4" />
          </Link>
        </div>
      </div>

      <section>
        <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-neutral-900">
          Artwork
        </h2>
        <p className="mt-1 text-[14px] text-neutral-500">
          Craft cutouts in Make. When you’re ready to put this on the wall,
          you’ll finish size and placement after sign-in.
        </p>

        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {stickers.map((sticker, index) => (
            <motion.li
              key={sticker.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                delay: Math.min(index * 0.05, 0.25),
                ease: [0.23, 1, 0.32, 1],
              }}
              className="overflow-hidden rounded-[24px] border border-black/[0.06] bg-[#f5f5f7]"
            >
              <div className="grid place-items-center px-4 py-8">
                <img
                  src={sticker.imageUrl}
                  alt=""
                  className="max-h-36 object-contain drop-shadow-lg"
                />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-black/[0.06] bg-white px-4 py-3">
                <span className="text-[12px] font-medium tracking-[-0.01em] text-neutral-500">
                  {sticker.style} · {sticker.filter}
                </span>
                <button
                  type="button"
                  className="press inline-flex h-8 items-center gap-1 rounded-full bg-black/[0.045] px-3 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-35"
                  disabled={busyId === sticker.id}
                  onClick={() => void deleteSticker(sticker)}
                >
                  <Trash weight="bold" className="size-3.5" />
                  Remove
                </button>
              </div>
            </motion.li>
          ))}
        </ul>

        {stickers.length === 0 ? (
          <div className="mt-5 rounded-[28px] border border-dashed border-black/[0.1] px-5 py-14 text-center">
            <p className="text-[22px] font-semibold tracking-[-0.02em] text-neutral-900">
              No artwork yet
            </p>
            <p className="mx-auto mt-2 max-w-sm text-[15px] text-neutral-500">
              Open Make with this sticker selected to craft and save artwork.
            </p>
            <Link
              to="/make"
              search={{ productId: product.id }}
              className="nk-btn mt-6"
            >
              Make artwork
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  )
}
