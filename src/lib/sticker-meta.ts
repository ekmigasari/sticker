/** Shared sticker naming + link helpers (safe for client + server). */

export function slugifyName(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
  return slug || "sticker"
}

/** Normalize a sticker website link. Returns null when incomplete/invalid. */
export function normalizeStickerUrl(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`

  if (!URL.canParse(withProtocol)) return null

  try {
    const parsed = new URL(withProtocol)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null
    const host = parsed.hostname
    if (!host) return null
    // Reject incomplete hosts like "https://" leftovers / single-label junk,
    // but allow localhost for local testing.
    if (host !== "localhost" && !host.includes(".")) return null
    return parsed.toString()
  } catch {
    return null
  }
}

export function isValidStickerUrl(raw: string): boolean {
  return normalizeStickerUrl(raw) != null
}
