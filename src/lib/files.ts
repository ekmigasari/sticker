export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export function safeFileName(name: string) {
  const base = name.split(/[/\\]/).pop()?.trim() || "upload"
  const cleaned = base.replace(/[^\w.\- ()]+/g, "_").slice(0, 180)
  return cleaned || "upload"
}

export function contentDisposition(fileName: string) {
  const fallback = fileName.replace(/[^\w.\- ]+/g, "_") || "download"
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}
