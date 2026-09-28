import { ArrowSquareOut, X } from "@phosphor-icons/react"
import { Link } from "@tanstack/react-router"
import { Button, buttonVariants } from "@/components/ui/button"
import type { Placement, Product, Sticker } from "@/domain/types"
import { cn } from "@/lib/utils"

type Props = {
  product: Product
  sticker: Sticker
  placement: Placement
  onClose: () => void
}

export function ProductSheet({ product, sticker, placement, onClose }: Props) {
  return (
    <aside className="pointer-events-auto absolute right-3 bottom-3 left-3 z-30 max-w-md rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md sm:right-4 sm:bottom-4 sm:left-auto">
      <div className="flex gap-3">
        <img
          src={sticker.imageDataUrl}
          alt={product.name}
          className="size-20 shrink-0 object-contain drop-shadow-md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
                {product.category} · {placement.sizeTier}
              </p>
              <h2 className="font-heading text-xl font-extrabold tracking-tight">
                {product.name}
              </h2>
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onClose}
              aria-label="Close"
            >
              <X weight="bold" />
            </Button>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {product.oneLiner}
          </p>
          {product.offer ? (
            <p className="mt-2 font-mono text-[11px] tracking-wide text-sticker-teal uppercase">
              {product.offer}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href={product.url}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ size: "sm" }), "rounded-xl")}
        >
          Visit
          <ArrowSquareOut weight="bold" data-icon="inline-end" />
        </a>
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-xl"
          )}
        >
          Product page
        </Link>
      </div>
    </aside>
  )
}
