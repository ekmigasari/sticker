import { useState } from "react"
import { Link, useRouter } from "@tanstack/react-router"
import { Plus, PencilSimple, Trash, CaretRight } from "@phosphor-icons/react"
import { motion } from "motion/react"
import type { ProductDTO } from "@/lib/product-api"
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
        `Delete “${product.name}”? This removes it from your dashboard and the directory.`
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
    <div className="nk-page">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="nk-label">{userEmail}</p>
          <h1 className="nk-title mt-2">Your stickers</h1>
          <p className="nk-subtitle mt-3">
            Each sticker is a product — title, short description, link, and
            category. Make one free, then sign in to set it up for the wall.
          </p>
        </div>
        {mode === "list" ? (
          <button
            type="button"
            className="nk-btn shrink-0"
            onClick={() => {
              setEditing(null)
              setMode("create")
            }}
          >
            <Plus weight="bold" className="size-4" />
            New sticker
          </button>
        ) : null}
      </header>

      {mode === "create" || mode === "edit" ? (
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
          className="rounded-[28px] border border-black/[0.06] bg-white p-5 sm:p-7"
        >
          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-neutral-900">
            {mode === "create" ? "Sticker details" : `Edit ${editing?.name}`}
          </h2>
          <p className="mt-1 text-[14px] text-neutral-500">
            These details show in the directory and on your public page.
          </p>
          <div className="mt-6">
            <ProductForm
              initial={editing ?? undefined}
              submitLabel={mode === "create" ? "Save sticker" : "Save changes"}
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
        <ul className="divide-y divide-black/[0.06]">
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
              className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4"
            >
              <Link
                to="/dashboard/products/$id"
                params={{ id: product.id }}
                className="group min-w-0 flex-1"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-neutral-900 sm:text-[19px]">
                    {product.name}
                  </h2>
                  <span className="text-[12px] font-medium tracking-[-0.01em] text-neutral-400">
                    {product.category}
                    {product.stickerCount
                      ? ` · ${product.stickerCount} art`
                      : " · no art yet"}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[14px] text-neutral-500">
                  {product.oneLiner}
                </p>
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-black/[0.045] px-3.5 text-[13px] font-medium tracking-[-0.01em] text-neutral-800 transition-colors hover:bg-black/[0.07]"
                  onClick={() => {
                    setEditing(product)
                    setMode("edit")
                  }}
                >
                  <PencilSimple weight="bold" className="size-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-black/[0.045] px-3.5 text-[13px] font-medium tracking-[-0.01em] text-red-600 transition-colors hover:bg-red-50 disabled:opacity-35"
                  disabled={busyId === product.id}
                  onClick={() => void deleteProduct(product)}
                >
                  <Trash weight="bold" className="size-3.5" />
                  Delete
                </button>
                <Link
                  to="/dashboard/products/$id"
                  params={{ id: product.id }}
                  aria-label={`Open ${product.name}`}
                  className="press grid size-9 place-items-center rounded-full bg-black/[0.045] text-neutral-800 transition-colors hover:bg-black/[0.07]"
                >
                  <CaretRight weight="bold" className="size-4" />
                </Link>
              </div>
            </motion.li>
          ))}
          {products.length === 0 ? (
            <li className="py-16 text-center">
              <p className="text-[22px] font-semibold tracking-[-0.02em] text-neutral-900">
                No stickers yet
              </p>
              <p className="mx-auto mt-2 max-w-sm text-[15px] text-neutral-500">
                Start in Make, or add details here and attach artwork next.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link to="/make" className="nk-btn">
                  Make a sticker
                </Link>
                <button
                  type="button"
                  className="nk-btn-secondary"
                  onClick={() => setMode("create")}
                >
                  Add details
                </button>
              </div>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  )
}
