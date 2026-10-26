export const PAPER_PRESETS = [
  { id: "a4", label: "A4", group: "ISO", widthMm: 210, heightMm: 297 },
  { id: "a3", label: "A3", group: "ISO", widthMm: 297, heightMm: 420 },
  { id: "a5", label: "A5", group: "ISO", widthMm: 148, heightMm: 210 },
  { id: "a6", label: "A6", group: "ISO", widthMm: 105, heightMm: 148 },
  { id: "b4", label: "B4", group: "ISO", widthMm: 250, heightMm: 353 },
  { id: "b5", label: "B5", group: "ISO", widthMm: 176, heightMm: 250 },
  { id: "f4", label: "F4 / Folio", group: "ISO", widthMm: 215, heightMm: 330 },
  { id: "a3plus", label: "A3+", group: "ISO", widthMm: 329, heightMm: 483 },
  {
    id: "letter",
    label: "US Letter",
    group: "US",
    widthMm: 216,
    heightMm: 279,
  },
  { id: "legal", label: "US Legal", group: "US", widthMm: 216, heightMm: 356 },
  { id: "tabloid", label: "Tabloid", group: "US", widthMm: 279, heightMm: 432 },
  {
    id: "half-letter",
    label: "Half Letter",
    group: "US",
    widthMm: 140,
    heightMm: 216,
  },
  {
    id: "photo-4x6",
    label: "4 × 6 in",
    group: "Photo",
    widthMm: 102,
    heightMm: 152,
  },
  {
    id: "photo-5x7",
    label: "5 × 7 in",
    group: "Photo",
    widthMm: 127,
    heightMm: 178,
  },
  {
    id: "photo-8x10",
    label: "8 × 10 in",
    group: "Photo",
    widthMm: 203,
    heightMm: 254,
  },
] as const

export const PAPER_GROUPS = ["ISO", "US", "Photo"] as const

export type PaperPresetId = (typeof PAPER_PRESETS)[number]["id"]
export type PaperId = PaperPresetId | "custom"

/** Snap step when the grid is on. */
export const GRID_MM = 5
export const STICKER_MM_MIN = 15
export const STICKER_MM_DEFAULT = 50
export const PAPER_MM_MIN = 100
export const PAPER_MM_MAX = 500
export const PRINT_NAME_MAX = 60
export const PRINT_COPIES_MAX = 40
export const PRINT_SHEETS_MAX = 30
/** Sticker rendered in Make. It is never stored on an account. */
export const MAKE_STICKER_ID = "make"
export const PRINT_MAKE_KEY = "ctoti.printMake"

export type PlacedCopy = {
  id: string
  stickerId: string
  name: string
  imageUrl: string
  xMm: number
  yMm: number
  wMm: number
  hMm: number
}

export type PaperDraft = {
  name: string
  paper: PaperId
  widthMm: number
  heightMm: number
  copies: PlacedCopy[]
  savedId: string | null
}

export type PrintArt = {
  stickerId: string
  name: string
  imageUrl: string
  archived?: boolean
}

export type PrintSheetSummary = {
  id: string
  name: string
  widthMm: number
  heightMm: number
  stickerCount: number
  updatedAt: string
  preview: Array<{
    id: string
    imageUrl: string
    xMm: number
    yMm: number
    wMm: number
    hMm: number
  }>
}

export type SavedPrintSheet = {
  id: string
  name: string
  paper: PaperId
  widthMm: number
  heightMm: number
  stickerMm: number
  copies: PlacedCopy[]
  updatedAt: string
}

export type SheetCopyInput = {
  stickerId: string
  xMm: number
  yMm: number
  wMm: number
  hMm: number
}

export type SheetInput = {
  name: string
  paper: PaperId
  widthMm: number
  heightMm: number
  stickerMm: number
  copies: SheetCopyInput[]
}

export type MakePrintSession = {
  imageUrl: string
  width: number
  height: number
  sizeMm: number
  paper?: PaperId
  pageWidthMm?: number
  pageHeightMm?: number
  copies?: Array<{
    id: string
    xMm: number
    yMm: number
    wMm: number
    hMm: number
  }>
}

export function emptyDraft(): PaperDraft {
  const a4 = PAPER_PRESETS[0]
  return {
    name: "Print sheet",
    paper: "a4",
    widthMm: a4.widthMm,
    heightMm: a4.heightMm,
    copies: [],
    savedId: null,
  }
}

export function isPaperId(value: string): value is PaperId {
  return (
    value === "custom" || PAPER_PRESETS.some((preset) => preset.id === value)
  )
}

export function orientedPreset(id: PaperPresetId, landscape: boolean) {
  const preset =
    PAPER_PRESETS.find((item) => item.id === id) ?? PAPER_PRESETS[0]
  return landscape
    ? { widthMm: preset.heightMm, heightMm: preset.widthMm }
    : { widthMm: preset.widthMm, heightMm: preset.heightMm }
}

export function roundMm(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.round(value * 10) / 10
}

export function snapMm(value: number, grid: boolean): number {
  if (!grid) return roundMm(value)
  return roundMm(Math.round(value / GRID_MM) * GRID_MM)
}

/** Longest side that still fits on the page. */
export function maxStickerMm(widthMm: number, heightMm: number): number {
  return Math.max(STICKER_MM_MIN, Math.min(widthMm, heightMm))
}

/** `aspect` is width / height. The longest side is `longestMm`. */
export function stickerBoxMm(longestMm: number, aspect: number) {
  const ratio = aspect > 0 && Number.isFinite(aspect) ? aspect : 1
  if (ratio >= 1) return { w: longestMm, h: longestMm / ratio }
  return { w: longestMm * ratio, h: longestMm }
}

export function moveCopy(
  copy: PlacedCopy,
  pageW: number,
  pageH: number,
  xMm: number,
  yMm: number,
  grid: boolean
): PlacedCopy {
  const maxX = Math.max(0, roundMm(pageW - copy.wMm))
  const maxY = Math.max(0, roundMm(pageH - copy.hMm))
  return {
    ...copy,
    xMm: Math.min(Math.max(0, snapMm(xMm, grid)), maxX),
    yMm: Math.min(Math.max(0, snapMm(yMm, grid)), maxY),
  }
}

/** Resize from the top-left, keeping the sticker's aspect. */
export function resizeCopy(
  copy: PlacedCopy,
  pageW: number,
  pageH: number,
  nextW: number,
  grid: boolean
): PlacedCopy {
  const aspect = copy.wMm / copy.hMm
  if (!(aspect > 0) || !Number.isFinite(aspect)) return copy
  let w = snapMm(Math.max(STICKER_MM_MIN, nextW), grid)
  let h = roundMm(w / aspect)
  if (h < STICKER_MM_MIN) {
    h = STICKER_MM_MIN
    w = roundMm(h * aspect)
  }
  if (w > pageW || h > pageH) {
    const fit = Math.min(pageW / w, pageH / h)
    w = roundMm(w * fit)
    h = roundMm(h * fit)
  }
  return moveCopy(
    { ...copy, wMm: Math.max(1, w), hMm: Math.max(1, h) },
    pageW,
    pageH,
    copy.xMm,
    copy.yMm,
    grid
  )
}

export function withAspect(
  copy: PlacedCopy,
  aspect: number,
  pageW: number,
  pageH: number,
  grid: boolean
): PlacedCopy {
  const longest = Math.max(copy.wMm, copy.hMm)
  const box = stickerBoxMm(longest, aspect)
  const fit = Math.min(1, pageW / box.w, pageH / box.h)
  const w = roundMm(box.w * fit)
  const h = roundMm(box.h * fit)
  return moveCopy(
    { ...copy, wMm: w, hMm: h },
    pageW,
    pageH,
    copy.xMm,
    copy.yMm,
    grid
  )
}

export function centeredCopy(
  art: PrintArt,
  aspect: number,
  longestMm: number,
  pageW: number,
  pageH: number
): PlacedCopy {
  const box = stickerBoxMm(longestMm, aspect)
  const fit = Math.min(1, pageW / box.w, pageH / box.h)
  const w = roundMm(box.w * fit)
  const h = roundMm(box.h * fit)
  const x = roundMm((pageW - w) / 2)
  const y = roundMm((pageH - h) / 2)
  return moveCopy(
    {
      id: crypto.randomUUID(),
      stickerId: art.stickerId,
      name: art.name,
      imageUrl: art.imageUrl,
      xMm: x,
      yMm: y,
      wMm: w,
      hMm: h,
    },
    pageW,
    pageH,
    x,
    y,
    false
  )
}

function overlaps(
  copy: PlacedCopy,
  x: number,
  y: number,
  w: number,
  h: number
): boolean {
  return (
    x < copy.xMm + copy.wMm - 0.5 &&
    x + w > copy.xMm + 0.5 &&
    y < copy.yMm + copy.hMm - 0.5 &&
    y + h > copy.yMm + 0.5
  )
}

function openSpot(
  copies: PlacedCopy[],
  w: number,
  h: number,
  pageW: number,
  pageH: number
): { xMm: number; yMm: number } {
  for (let y = 0; y + h <= pageH + 0.01; y += GRID_MM) {
    for (let x = 0; x + w <= pageW + 0.01; x += GRID_MM) {
      const blocked = copies.some((copy) => overlaps(copy, x, y, w, h))
      if (!blocked) return { xMm: x, yMm: y }
    }
  }
  return { xMm: 0, yMm: 0 }
}

export function addCopy(
  draft: PaperDraft,
  art: PrintArt,
  aspect: number,
  longestMm: number,
  grid: boolean
): { draft: PaperDraft; error?: string } {
  if (draft.copies.length >= PRINT_COPIES_MAX) {
    return { draft, error: "This paper is full." }
  }
  const box = stickerBoxMm(longestMm, aspect)
  const fit = Math.min(1, draft.widthMm / box.w, draft.heightMm / box.h)
  const w = roundMm(box.w * fit)
  const h = roundMm(box.h * fit)
  const spot = openSpot(draft.copies, w, h, draft.widthMm, draft.heightMm)
  const copy = moveCopy(
    {
      id: crypto.randomUUID(),
      stickerId: art.stickerId,
      name: art.name,
      imageUrl: art.imageUrl,
      xMm: spot.xMm,
      yMm: spot.yMm,
      wMm: w,
      hMm: h,
    },
    draft.widthMm,
    draft.heightMm,
    spot.xMm,
    spot.yMm,
    grid
  )
  return { draft: { ...draft, copies: [...draft.copies, copy] } }
}

export function duplicateCopy(
  draft: PaperDraft,
  id: string,
  grid: boolean
): { draft: PaperDraft; error?: string } {
  const source = draft.copies.find((copy) => copy.id === id)
  if (!source) return { draft }
  if (draft.copies.length >= PRINT_COPIES_MAX) {
    return { draft, error: "This paper is full." }
  }
  const gap = grid ? GRID_MM : 8
  let next = moveCopy(
    { ...source, id: crypto.randomUUID() },
    draft.widthMm,
    draft.heightMm,
    source.xMm + gap,
    source.yMm + gap,
    grid
  )
  const stayed =
    Math.abs(next.xMm - source.xMm) < 0.5 &&
    Math.abs(next.yMm - source.yMm) < 0.5
  if (stayed) {
    const spot = openSpot(
      draft.copies,
      source.wMm,
      source.hMm,
      draft.widthMm,
      draft.heightMm
    )
    next = moveCopy(
      next,
      draft.widthMm,
      draft.heightMm,
      spot.xMm,
      spot.yMm,
      grid
    )
  }
  return { draft: { ...draft, copies: [...draft.copies, next] } }
}

export function removeCopy(draft: PaperDraft, id: string): PaperDraft {
  return { ...draft, copies: draft.copies.filter((copy) => copy.id !== id) }
}

export function refitCopy(
  copy: PlacedCopy,
  pageW: number,
  pageH: number
): PlacedCopy {
  let w = copy.wMm
  let h = copy.hMm
  const fit = Math.min(1, pageW / w, pageH / h)
  w = roundMm(w * fit)
  h = roundMm(h * fit)
  return moveCopy(
    { ...copy, wMm: Math.max(1, w), hMm: Math.max(1, h) },
    pageW,
    pageH,
    copy.xMm,
    copy.yMm,
    false
  )
}

function refit(draft: PaperDraft): PaperDraft {
  return {
    ...draft,
    copies: draft.copies.map((copy) =>
      refitCopy(copy, draft.widthMm, draft.heightMm)
    ),
  }
}

export function withPaper(
  draft: PaperDraft,
  paper: PaperId,
  landscape: boolean
): PaperDraft {
  if (paper === "custom") return { ...draft, paper }
  const size = orientedPreset(paper, landscape)
  return refit({
    ...draft,
    paper,
    widthMm: size.widthMm,
    heightMm: size.heightMm,
  })
}

export function withCustomPaper(
  draft: PaperDraft,
  widthMm: number,
  heightMm: number
): PaperDraft {
  return refit({
    ...draft,
    paper: "custom",
    widthMm: clampInt(widthMm, PAPER_MM_MIN, PAPER_MM_MAX),
    heightMm: clampInt(heightMm, PAPER_MM_MIN, PAPER_MM_MAX),
  })
}

export function draftFromSaved(sheet: SavedPrintSheet): PaperDraft {
  return {
    name: sheet.name,
    paper: sheet.paper,
    widthMm: sheet.widthMm,
    heightMm: sheet.heightMm,
    copies: sheet.copies,
    savedId: sheet.id,
  }
}

export function draftFromMake(session: MakePrintSession): PaperDraft {
  const base = emptyDraft()
  const paper =
    session.paper && isPaperId(session.paper) ? session.paper : base.paper
  const widthMm = clampInt(
    session.pageWidthMm ?? base.widthMm,
    PAPER_MM_MIN,
    PAPER_MM_MAX
  )
  const heightMm = clampInt(
    session.pageHeightMm ?? base.heightMm,
    PAPER_MM_MIN,
    PAPER_MM_MAX
  )
  const art: PrintArt = {
    stickerId: MAKE_STICKER_ID,
    name: "Sticker",
    imageUrl: session.imageUrl,
  }
  const restored = (session.copies ?? []).flatMap((copy) => {
    if (!copy || typeof copy.id !== "string") return []
    const xMm = Number(copy.xMm)
    const yMm = Number(copy.yMm)
    const wMm = Number(copy.wMm)
    const hMm = Number(copy.hMm)
    if (![xMm, yMm, wMm, hMm].every(Number.isFinite) || wMm <= 0 || hMm <= 0) {
      return []
    }
    return [
      refitCopy(
        {
          id: copy.id,
          stickerId: MAKE_STICKER_ID,
          name: "Sticker",
          imageUrl: session.imageUrl,
          xMm,
          yMm,
          wMm,
          hMm,
        },
        widthMm,
        heightMm
      ),
    ]
  })
  const aspect = session.width / session.height
  return {
    name: "Print sheet",
    paper,
    widthMm,
    heightMm,
    savedId: null,
    copies:
      restored.length > 0
        ? restored.slice(0, PRINT_COPIES_MAX)
        : [centeredCopy(art, aspect, session.sizeMm, widthMm, heightMm)],
  }
}

export function readMakeSession(raw: string | null): MakePrintSession | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<MakePrintSession>
    if (!value || typeof value.imageUrl !== "string") return null
    if (!value.imageUrl.startsWith("data:image/")) return null
    const width = Number(value.width)
    const height = Number(value.height)
    const sizeMm = Number(value.sizeMm)
    if (!(width > 0) || !(height > 0) || !(sizeMm > 0)) return null
    const paper =
      typeof value.paper === "string" && isPaperId(value.paper)
        ? value.paper
        : undefined
    return {
      imageUrl: value.imageUrl,
      width,
      height,
      sizeMm,
      paper,
      pageWidthMm: Number(value.pageWidthMm) || undefined,
      pageHeightMm: Number(value.pageHeightMm) || undefined,
      copies: Array.isArray(value.copies) ? value.copies : undefined,
    }
  } catch {
    return null
  }
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

export function parseSheetInput(body: unknown): { error: string } | SheetInput {
  if (!body || typeof body !== "object") {
    return { error: "Choose a paper size and add a sticker." }
  }
  const raw = body as Record<string, unknown>
  const name = typeof raw.name === "string" ? raw.name.trim() : ""
  if (!name || name.length > PRINT_NAME_MAX) {
    return { error: `Name the sheet in ${PRINT_NAME_MAX} characters or fewer.` }
  }
  const paper = typeof raw.paper === "string" ? raw.paper : ""
  if (!isPaperId(paper)) return { error: "Choose a paper size." }

  const widthMm = Number(raw.widthMm)
  const heightMm = Number(raw.heightMm)
  if (
    !Number.isInteger(widthMm) ||
    widthMm < PAPER_MM_MIN ||
    widthMm > PAPER_MM_MAX ||
    !Number.isInteger(heightMm) ||
    heightMm < PAPER_MM_MIN ||
    heightMm > PAPER_MM_MAX
  ) {
    return {
      error: `Paper sides must be whole millimetres from ${PAPER_MM_MIN} to ${PAPER_MM_MAX}.`,
    }
  }

  if (paper !== "custom") {
    const preset = PAPER_PRESETS.find((item) => item.id === paper)
    const matches =
      preset &&
      ((widthMm === preset.widthMm && heightMm === preset.heightMm) ||
        (widthMm === preset.heightMm && heightMm === preset.widthMm))
    if (!matches) {
      return { error: "That size doesn't match the paper you picked." }
    }
  }

  const stickerMm = Number(raw.stickerMm)
  const stickerMax = maxStickerMm(widthMm, heightMm)
  if (
    !Number.isInteger(stickerMm) ||
    stickerMm < STICKER_MM_MIN ||
    stickerMm > stickerMax
  ) {
    return { error: "Choose a sticker size that fits on this paper." }
  }

  if (!Array.isArray(raw.copies) || raw.copies.length === 0) {
    return { error: "Add a sticker before saving." }
  }
  if (raw.copies.length > PRINT_COPIES_MAX) {
    return { error: "This paper is full." }
  }

  const copies: SheetCopyInput[] = []
  for (const item of raw.copies) {
    if (!item || typeof item !== "object") {
      return { error: "A sticker on this sheet is missing." }
    }
    const row = item as Record<string, unknown>
    const stickerId = typeof row.stickerId === "string" ? row.stickerId : ""
    const xMm = roundMm(Number(row.xMm))
    const yMm = roundMm(Number(row.yMm))
    const wMm = roundMm(Number(row.wMm))
    const hMm = roundMm(Number(row.hMm))
    if (!stickerId || stickerId === MAKE_STICKER_ID || stickerId.length > 80) {
      return { error: "A sticker on this sheet can't be printed." }
    }
    if (
      wMm < 10 ||
      hMm < 10 ||
      wMm > widthMm + 0.2 ||
      hMm > heightMm + 0.2 ||
      xMm < -0.05 ||
      yMm < -0.05 ||
      xMm + wMm > widthMm + 0.6 ||
      yMm + hMm > heightMm + 0.6
    ) {
      return { error: "Keep each sticker on the paper." }
    }
    copies.push({ stickerId, xMm, yMm, wMm, hMm })
  }
  return { name, paper, widthMm, heightMm, stickerMm, copies }
}
