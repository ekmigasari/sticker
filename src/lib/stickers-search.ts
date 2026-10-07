import { isCategory, type Category } from "@/domain/types"

/** Pseudo-category: stickers with at least part of a plot still showing on the wall. */
export const WALL_FILTER = "Wall"

export type StickersFilter = Category | typeof WALL_FILTER

export type StickersSearch = {
  category?: StickersFilter
  /** Top is the default, so only Newest is spelled out in the URL. */
  sort?: "newest"
  q?: string
  page?: number
}

export function parseStickersSearch(
  search: Record<string, unknown>
): StickersSearch {
  const page = Number(search.page)
  const q = typeof search.q === "string" ? search.q.trim() : ""
  return {
    category:
      typeof search.category === "string" &&
      (search.category === WALL_FILTER || isCategory(search.category))
        ? search.category
        : undefined,
    sort: search.sort === "newest" ? "newest" : undefined,
    q: q || undefined,
    page: Number.isInteger(page) && page > 1 ? page : undefined,
  }
}
