/** Allow only same-origin relative paths for post-auth redirects. */
export function safeNextPath(value: unknown, fallback = "/dashboard"): string {
  if (typeof value !== "string") return fallback
  if (!value.startsWith("/") || value.startsWith("//")) return fallback
  if (value.includes("://")) return fallback
  return value
}
