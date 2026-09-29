import { createFileRoute, redirect } from "@tanstack/react-router"

/** Legacy dashboard product manage → sticker manage. */
export const Route = createFileRoute("/_protected/dashboard/products/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/dashboard/stickers/$id",
      params: { id: params.id },
    })
  },
})
