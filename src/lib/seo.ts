import { createIsomorphicFn } from "@tanstack/react-start"
import type { Category } from "@/domain/types"
import type { StickerDTO } from "@/lib/sticker-api"

/** A `head().scripts` entry. `<` is escaped so user text can't close the tag. */
function jsonLd(data: Record<string, unknown>) {
  return {
    type: "application/ld+json",
    children: JSON.stringify(data).replace(/</g, "\\u003c"),
  }
}

export const SITE_NAME = "Cool Things on the Internet"
export const SITE_DESCRIPTION =
  "Every cool thing deserves fame. Make it a sticker and stick it on the internet's wall of fame."

/** Search results cut titles past ~60 characters and descriptions past ~160. */
const TITLE_MAX = 60
const DESCRIPTION_MAX = 160

/** Crawlers and link unfurlers need absolute URLs for canonical and og:image. */
export const siteOrigin = createIsomorphicFn()
  .server(() => process.env.BETTER_AUTH_URL ?? "http://localhost:3000")
  .client(() => window.location.origin)

export function absoluteUrl(path: string): string {
  return new URL(path, siteOrigin()).toString()
}

/** Title, description, Open Graph and Twitter tags for a page; site defaults when omitted. */
export function seo({
  title,
  description = SITE_DESCRIPTION,
  image = "/og-image.jpg",
}: { title?: string; description?: string; image?: string } = {}) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : SITE_NAME
  const imageUrl = absoluteUrl(image)
  return [
    { title: fullTitle },
    { name: "description", content: description },
    { property: "og:title", content: title ?? SITE_NAME },
    { property: "og:description", content: description },
    { property: "og:image", content: imageUrl },
    { name: "twitter:title", content: title ?? SITE_NAME },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
  ]
}

export function categoryPath(category: Category): string {
  return `/stickers?${new URLSearchParams({ category })}`
}

function collapse(text: string | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim()
}

function asSentence(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`
}

function clip(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max - 1)
  const space = cut.lastIndexOf(" ")
  const head = space > max * 0.6 ? cut.slice(0, space) : cut
  return `${head.replace(/[\s,.;:!?–—-]+$/, "")}…`
}

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return null
  }
}

/** A one-liner that just repeats the name adds nothing to titles or copy. */
function tagline(sticker: { name: string; oneLiner: string }): string {
  const line = collapse(sticker.oneLiner)
  return line.toLowerCase() === collapse(sticker.name).toLowerCase() ? "" : line
}

/** "Other" says nothing about the sticker, so it never reaches titles or copy. */
function topic(category: Category): Category | null {
  return category === "Other" ? null : category
}

type SeoSticker = Pick<
  StickerDTO,
  | "id"
  | "slug"
  | "name"
  | "oneLiner"
  | "url"
  | "category"
  | "description"
  | "imageUrl"
  | "archivedAt"
  | "createdAt"
  | "updatedAt"
>

/** Title without the site name, for og:title and the page title. */
export function stickerTitle(sticker: SeoSticker): string {
  const name = collapse(sticker.name)
  const line = tagline(sticker)
  if (line && name.length + line.length + 2 <= TITLE_MAX) {
    return `${name}: ${line}`
  }
  const category = topic(sticker.category)
  if (category && name.length + category.length + 3 <= TITLE_MAX) {
    return `${name} · ${category}`
  }
  return clip(name, TITLE_MAX)
}

export function stickerDescription(sticker: SeoSticker): string {
  const parts = [tagline(sticker), collapse(sticker.description)]
    .filter(Boolean)
    .map(asSentence)
  const category = topic(sticker.category)
  if (!sticker.description) {
    parts.push(
      category
        ? `${collapse(sticker.name)}, listed in ${category} on ${SITE_NAME}.`
        : `${collapse(sticker.name)}, listed on ${SITE_NAME}.`
    )
  }
  return clip(parts.join(" "), DESCRIPTION_MAX)
}

export function stickerKeywords(sticker: SeoSticker): string[] {
  const category = topic(sticker.category)
  const candidates = [
    collapse(sticker.name),
    category,
    ...(category?.includes("&") ? category.split(/\s*&\s*/) : []),
    hostname(sticker.url),
    "sticker",
    SITE_NAME,
  ]
  const seen = new Set<string>()
  return candidates.filter((k): k is string => {
    if (!k) return false
    const key = k.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** `head()` payload for a public sticker page. */
export function stickerHead(sticker: SeoSticker) {
  const title = stickerTitle(sticker)
  const description = stickerDescription(sticker)
  const keywords = stickerKeywords(sticker)
  const origin = siteOrigin()
  const url = absoluteUrl(`/stickers/${sticker.slug}`)
  const image = absoluteUrl(sticker.imageUrl)
  const category = topic(sticker.category)

  return {
    meta: [
      ...seo({ title, description }),
      { name: "keywords", content: keywords.join(", ") },
      ...(sticker.archivedAt
        ? [{ name: "robots", content: "noindex, follow" }]
        : []),
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { property: "article:published_time", content: sticker.createdAt },
      { property: "article:modified_time", content: sticker.updatedAt },
      ...(category ? [{ property: "article:section", content: category }] : []),
    ],
    links: [{ rel: "canonical", href: url }],
    scripts: [
      jsonLd({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CreativeWork",
            "@id": `${url}#sticker`,
            name: collapse(sticker.name),
            headline: title,
            description,
            url,
            image,
            keywords: keywords.join(", "),
            ...(category ? { genre: category } : {}),
            dateCreated: sticker.createdAt,
            dateModified: sticker.updatedAt,
            about: {
              "@type": "WebSite",
              name: collapse(sticker.name),
              url: sticker.url,
            },
            isPartOf: { "@type": "WebSite", name: SITE_NAME, url: origin },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: "Stickers",
                item: absoluteUrl("/stickers"),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: sticker.category,
                item: absoluteUrl(categoryPath(sticker.category)),
              },
              {
                "@type": "ListItem",
                position: 3,
                name: collapse(sticker.name),
                item: url,
              },
            ],
          },
        ],
      }),
    ],
  }
}

/** `head()` payload for one category's leaderboard. Later pages skip the canonical so they stay indexable. */
export function categoryHead(
  category: Category,
  count: number,
  { canonical }: { canonical: boolean }
) {
  const title = `${category} stickers`
  const description = clip(
    `${count.toLocaleString("en-US")} ${category} ${count === 1 ? "sticker" : "stickers"} on ${SITE_NAME}, ranked by what they spent on the wall. Make one and put it up.`,
    DESCRIPTION_MAX
  )
  const url = absoluteUrl(categoryPath(category))
  return {
    meta: [
      ...seo({ title, description }),
      { property: "og:url", content: url },
    ],
    links: canonical ? [{ rel: "canonical", href: url }] : [],
  }
}
