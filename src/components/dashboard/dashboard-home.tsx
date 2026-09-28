import { useState } from "react"
import { Link, useRouter } from "@tanstack/react-router"
import { Plus, PencilSimple, Trash, Sticker } from "@phosphor-icons/react"
import { motion } from "motion/react"
import type { ProductDTO } from "@/lib/product-api"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ProductForm, type ProductFormValues } from "./product-form"

async function readError(response: Response) {
  const payload = (await response.json().catch(() => null)) as {
    error?: string
  } | null
  return payload?.error ?? "Request failed."
}

export function DashboardHome({
  userEmail,
  products: initialProducts,
}: {
  userEmail: string
  products: ProductDTO[]
}) {
  const router = useRouter()
  const [products, setProducts] = useState(initialProducts)
  const [mode, setMode] = useState<"list" | "create" | "edit">("list")
  const [editing, setEditing] = useState<ProductDTO | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function createProduct(values: ProductFormValues) {
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    })
    if (!response.ok) throw new Error(await readError(response))
    const payload = (await response.json()) as { product: ProductDTO }
    setProducts((prev) => [payload.product, ...prev])
    setMode("list")
    await router.invalidate()
  }

  async function updateProduct(values: ProductFormValues) {
    if (!editing) return
    const response = await fetch(`/api/products/${editing.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(values),
    })
    if (!response.ok) throw new Error(await readError(response))
    const payload = (await response.json()) as { product: ProductDTO }
    setProducts((prev) =>
      prev.map((p) => (p.id === payload.product.id ? payload.product : p))
    )
    setEditing(null)
    setMode("list")
    await router.invalidate()
  }

  async function deleteProduct(product: ProductDTO) {
    if (
      !window.confirm(
        `Delete “${product.name}”? Stickers on this product will be removed.`
      )
    ) {
      return
    }
    setBusyId(product.id)
    const response = await fetch(`/api/products/${product.id}`, {
      method: "DELETE",
    })
    setBusyId(null)
    if (!response.ok) {
      window.alert(await readError(response))
      return
    }
    setProducts((prev) => prev.filter((p) => p.id !== product.id))
    await router.invalidate()
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            {userEmail}
          </p>
          <h1 className="mt-2 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
            Your products
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Create products for the public directory, then attach stickers from
            the maker.
          </p>
          <Link
            to="/files"
            className="mt-3 inline-block font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase hover:text-foreground"
          >
            Manage raw uploads →
          </Link>
        </div>
        {mode === "list" ? (
          <Button
            className="rounded-2xl shadow-sm"
            onClick={() => {
              setEditing(null)
              setMode("create")
            }}
          >
            <Plus weight="bold" data-icon="inline-start" />
            New product
          </Button>
        ) : null}
      </header>

      {mode === "create" || mode === "edit" ? (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-3xl border border-border bg-card/90 p-5 sm:p-7"
        >
          <h2 className="font-heading text-2xl font-extrabold tracking-tight">
            {mode === "create" ? "Add a product" : `Edit ${editing?.name}`}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            These details show on the public directory and product page.
          </p>
          <div className="mt-6">
            <ProductForm
              initial={editing ?? undefined}
              submitLabel={mode === "create" ? "Create product" : "Save changes"}
              onSubmit={mode === "create" ? createProduct : updateProduct}
              onCancel={() => {
                setMode("list")
                setEditing(null)
              }}
            />
          </div>
        </motion.section>
      ) : null}

      {mode === "list" ? (
        <ul className="divide-y divide-border rounded-3xl border border-border bg-card/80">
          {products.map((product, index) => (
            <motion.li
              key={product.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.28,
                delay: Math.min(index * 0.04, 0.2),
                ease: [0.23, 1, 0.32, 1],
              }}
              className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <Link
                    to="/dashboard/products/$id"
                    params={{ id: product.id }}
                    className="font-heading text-xl font-extrabold tracking-tight hover:underline"
                  >
                    {product.name}
                  </Link>
                  <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                    {product.category} · {product.stickerCount} sticker
                    {product.stickerCount === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="truncate text-sm text-muted-foreground">
                  {product.oneLiner}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/dashboard/products/$id"
                  params={{ id: product.id }}
                  className={cn(
                    buttonVariants({ size: "sm", variant: "secondary" }),
                    "rounded-xl"
                  )}
                >
                  <Sticker weight="bold" data-icon="inline-start" />
                  Stickers
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => {
                    setEditing(product)
                    setMode("edit")
                  }}
                >
                  <PencilSimple weight="bold" data-icon="inline-start" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-destructive"
                  disabled={busyId === product.id}
                  onClick={() => void deleteProduct(product)}
                >
                  <Trash weight="bold" data-icon="inline-start" />
                  Delete
                </Button>
              </div>
            </motion.li>
          ))}
          {products.length === 0 ? (
            <li className="px-5 py-12 text-center">
              <p className="font-heading text-xl font-extrabold">No products yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Add your first product, then make stickers for it.
              </p>
              <Button
                className="mt-5 rounded-2xl"
                onClick={() => setMode("create")}
              >
                <Plus weight="bold" data-icon="inline-start" />
                Create product
              </Button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
