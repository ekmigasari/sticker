import { Link, useRouter } from "@tanstack/react-router"
import { ArrowLeft, Plus, Trash } from "@phosphor-icons/react"
import { motion } from "motion/react"
import type { ProductDTO, StickerDTO } from "@/lib/product-api"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
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
    if (!window.confirm("Remove this sticker from the product?")) return
    setBusyId(sticker.id)
    const response = await fetch(`/api/stickers/${sticker.id}`, {
      method: "DELETE",
    })
    setBusyId(null)
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      window.alert(payload?.error ?? "Could not delete sticker.")
      return
    }
    setStickers((prev) => prev.filter((s) => s.id !== sticker.id))
    await router.invalidate()
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-8">
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:text-foreground"
        >
          <ArrowLeft weight="bold" className="size-3.5" />
          Dashboard
        </Link>
        <p className="mt-4 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          {product.category}
        </p>
        <h1 className="mt-2 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
          {product.name}
        </h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{product.oneLiner}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/make"
            search={{ productId: product.id }}
            className={cn(buttonVariants(), "rounded-2xl")}
          >
            <Plus weight="bold" data-icon="inline-start" />
            Add sticker in Make
          </Link>
          <Link
            to="/product/$id"
            params={{ id: product.id }}
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-2xl"
            )}
          >
            View public page
          </Link>
        </div>
      </div>

      <section>
        <h2 className="font-heading text-2xl font-extrabold tracking-tight">
          Stickers
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One product can hold many stickers. New ones are made in the free
          sticker editor.
        </p>

        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card/90"
            >
              <div className="grid place-items-center bg-muted/50 px-4 py-8">
                <img
                  src={sticker.imageUrl}
                  alt=""
                  className="max-h-36 object-contain drop-shadow-lg"
                />
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
                <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                  {sticker.style} · {sticker.filter}
                </span>
                <Button
                  size="xs"
                  variant="outline"
                  className="rounded-lg text-destructive"
                  disabled={busyId === sticker.id}
                  onClick={() => void deleteSticker(sticker)}
                >
                  <Trash weight="bold" data-icon="inline-start" />
                  Remove
                </Button>
              </div>
            </motion.li>
          ))}
        </ul>

        {stickers.length === 0 ? (
          <div className="mt-5 rounded-3xl border border-dashed border-border px-5 py-12 text-center">
            <p className="font-heading text-xl font-extrabold">No stickers yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Open Make with this product selected to save a sticker here.
            </p>
            <Link
              to="/make"
              search={{ productId: product.id }}
              className={cn(buttonVariants(), "mt-5 inline-flex rounded-2xl")}
            >
              Make a sticker
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  )
}
