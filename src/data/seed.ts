import type { Category, Placement, SizeTier, Sticker } from "@/domain/types"
import { sizePx } from "@/domain/types"
import { SEED_PALETTE, makeSeedStickerDataUrl } from "@/lib/seed-stickers"

type SeedDef = {
  id: string
  name: string
  oneLiner: string
  url: string
  category: Category
  offer?: string
  x: number
  y: number
  tier: SizeTier
  daysAgo: number
}

const SEED_DEFS: SeedDef[] = [
  {
    id: "shipkit",
    name: "ShipKit",
    oneLiner: "Launch checklists that actually get checked.",
    url: "https://example.com/shipkit",
    category: "Developer Tools",
    offer: "Free forever for solo makers",
    x: 460,
    y: 450,
    tier: "L",
    daysAgo: 40,
  },
  {
    id: "pitchy",
    name: "Pitchy",
    oneLiner: "Cold email that doesn't sound cold.",
    url: "https://example.com/pitchy",
    category: "SaaS",
    x: 380,
    y: 380,
    tier: "M",
    daysAgo: 38,
  },
  {
    id: "notebar",
    name: "NoteBar",
    oneLiner: "A notes app that lives in your menu bar.",
    url: "https://example.com/notebar",
    category: "Mobile",
    x: 560,
    y: 420,
    tier: "M",
    daysAgo: 35,
  },
  {
    id: "pixelpond",
    name: "Pixel Pond",
    oneLiner: "A tiny cozy fishing game for breaks.",
    url: "https://example.com/pixelpond",
    category: "Games",
    x: 300,
    y: 520,
    tier: "M",
    daysAgo: 32,
  },
  {
    id: "makermail",
    name: "Maker Mail",
    oneLiner: "Weekly shipping stories from indie founders.",
    url: "https://example.com/makermail",
    category: "Newsletter",
    offer: "First month free",
    x: 620,
    y: 520,
    tier: "M",
    daysAgo: 28,
  },
  {
    id: "formfox",
    name: "FormFox",
    oneLiner: "Pretty forms without the SaaS tax.",
    url: "https://example.com/formfox",
    category: "Developer Tools",
    x: 200,
    y: 200,
    tier: "S",
    daysAgo: 26,
  },
  {
    id: "glowtype",
    name: "GlowType",
    oneLiner: "Display fonts with a makerspace vibe.",
    url: "https://example.com/glowtype",
    category: "Design",
    x: 720,
    y: 180,
    tier: "M",
    daysAgo: 24,
  },
  {
    id: "stacksnap",
    name: "StackSnap",
    oneLiner: "Screenshot your whole stack in one click.",
    url: "https://example.com/stacksnap",
    category: "Developer Tools",
    x: 140,
    y: 640,
    tier: "M",
    daysAgo: 22,
  },
  {
    id: "refundly",
    name: "Refundly",
    oneLiner: "Friendly churn saves for tiny SaaS.",
    url: "https://example.com/refundly",
    category: "SaaS",
    x: 780,
    y: 640,
    tier: "S",
    daysAgo: 20,
  },
  {
    id: "campfire",
    name: "Campfire HQ",
    oneLiner: "Async standups that feel human.",
    url: "https://example.com/campfire",
    category: "SaaS",
    x: 480,
    y: 700,
    tier: "L",
    daysAgo: 18,
  },
  {
    id: "doodleops",
    name: "DoodleOps",
    oneLiner: "Draw your architecture. Export a diagram.",
    url: "https://example.com/doodleops",
    category: "Design",
    x: 80,
    y: 420,
    tier: "M",
    daysAgo: 16,
  },
  {
    id: "tinytrail",
    name: "TinyTrail",
    oneLiner: "Privacy-first analytics for indie sites.",
    url: "https://example.com/tinytrail",
    category: "Developer Tools",
    offer: "10k events free",
    x: 840,
    y: 400,
    tier: "M",
    daysAgo: 14,
  },
  {
    id: "questlog",
    name: "Quest Log",
    oneLiner: "Gamify your personal roadmap.",
    url: "https://example.com/questlog",
    category: "Productivity",
    x: 420,
    y: 120,
    tier: "S",
    daysAgo: 12,
  },
  {
    id: "brewcli",
    name: "BrewCLI",
    oneLiner: "Ship CLI tools with taste.",
    url: "https://example.com/brewcli",
    category: "Developer Tools",
    x: 640,
    y: 280,
    tier: "S",
    daysAgo: 10,
  },
  {
    id: "softserve",
    name: "Soft Serve",
    oneLiner: "Status pages that don't look like status pages.",
    url: "https://example.com/softserve",
    category: "SaaS",
    x: 250,
    y: 780,
    tier: "M",
    daysAgo: 8,
  },
  {
    id: "inkdrop",
    name: "Inkdrop Press",
    oneLiner: "A zine starter for product launches.",
    url: "https://example.com/inkdrop",
    category: "Design",
    x: 700,
    y: 780,
    tier: "M",
    daysAgo: 6,
  },
  {
    id: "orbitchat",
    name: "Orbit Chat",
    oneLiner: "Community chat without the timeline anxiety.",
    url: "https://example.com/orbitchat",
    category: "Community",
    x: 520,
    y: 560,
    tier: "S",
    daysAgo: 4,
  },
  {
    id: "launchlane",
    name: "Launch Lane",
    oneLiner: "A PH launch checklist with vibes.",
    url: "https://example.com/launchlane",
    category: "Marketing",
    offer: "Launch week template free",
    x: 340,
    y: 300,
    tier: "M",
    daysAgo: 2,
  },
  {
    id: "crumb",
    name: "Crumb",
    oneLiner: "Micro-SaaS ideas baked daily.",
    url: "https://example.com/crumb",
    category: "Newsletter",
    x: 580,
    y: 200,
    tier: "S",
    daysAgo: 1,
  },
  {
    id: "wallflower",
    name: "Wallflower",
    oneLiner: "The first sticker on Sticker Wall.",
    url: "https://stickerwall.local",
    category: "Other",
    x: 470,
    y: 470,
    tier: "S",
    daysAgo: 0,
  },
]

function isoDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

export type SeedBundle = {
  stickers: Sticker[]
  placements: Placement[]
}

let cached: SeedBundle | null = null

export function buildSeedBundle(): SeedBundle {
  if (cached) return cached
  if (typeof document === "undefined") {
    return { stickers: [], placements: [] }
  }

  const stickers: Sticker[] = []
  const placements: Placement[] = []

  SEED_DEFS.forEach((def, i) => {
    const palette = SEED_PALETTE[i % SEED_PALETTE.length]
    const createdAt = isoDaysAgo(def.daysAgo)
    const imageDataUrl = makeSeedStickerDataUrl({
      label: def.name,
      fill: palette.fill,
      accent: palette.accent,
    })

    const sticker: Sticker = {
      id: `stk_${def.id}`,
      slug: def.id,
      name: def.name,
      oneLiner: def.oneLiner,
      url: def.url,
      category: def.category,
      offer: def.offer,
      imageDataUrl,
      outlineColor: palette.accent,
      outlineThickness: 10,
      createdAt,
    }
    const dim = sizePx(def.tier)
    const placement: Placement = {
      id: `plc_${def.id}`,
      stickerId: sticker.id,
      x: def.x,
      y: def.y,
      width: dim,
      height: dim,
      zIndex: i + 1,
      sizeTier: def.tier,
      createdAt,
    }

    stickers.push(sticker)
    placements.push(placement)
  })

  cached = { stickers, placements }
  return cached
}
