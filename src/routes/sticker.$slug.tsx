import { createFileRoute, redirect } from "@tanstack/react-router"

/** Old detail URL → /stickers/$slug. */
export const Route = createFileRoute("/sticker/$slug")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/stickers/$slug",
      params: { slug: params.slug },
      statusCode: 301,
    })
  },
})
