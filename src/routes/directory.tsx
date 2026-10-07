import { createFileRoute, redirect } from "@tanstack/react-router"
import { parseStickersSearch } from "@/lib/stickers-search"

/** Old listing URL → /stickers, keeping filters. */
export const Route = createFileRoute("/directory")({
  validateSearch: parseStickersSearch,
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/stickers", search, statusCode: 301 })
  },
})
