import { createFileRoute, redirect } from "@tanstack/react-router"

/** Legacy product URL → sticker page. */
export const Route = createFileRoute("/product/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/sticker/$id",
      params: { id: params.id },
    })
  },
})
