import { createServerFn } from "@tanstack/react-start"
import {
  STICKER_SCALE_FIT_MAX,
  STICKER_SCALE_MIN,
  isValidPlot,
  plotCoverage,
  restorePrice,
  snapPlotOrigin,
  unitsToPx,
  type Placement,
  type Sticker,
} from "@/domain/types"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { serializeSticker } from "@/lib/sticker-api"
import { wallStickerFromDTO } from "@/lib/wall-sticker"

/** Any constant works; it only has to be the same for every wall write. */
const WALL_WRITE_LOCK = 7_310_001

type PlacementRecord = {
  id: string
  stickerId: string
  x: number
  y: number
  width: number
  height: number
  unitsW: number
  unitsH: number
  zIndex: number
  stickerScale: number
  rotation: number
  offsetX: number
  offsetY: number
  visibleShare: number
  coveredBy: number
  createdAt: Date
}

export function serializePlacement(p: PlacementRecord): Placement {
  return {
    id: p.id,
    stickerId: p.stickerId,
    x: p.x,
    y: p.y,
    width: p.width,
    height: p.height,
    unitsW: p.unitsW,
    unitsH: p.unitsH,
    zIndex: p.zIndex,
    stickerScale: p.stickerScale,
    rotation: p.rotation,
    stickerOffsetX: p.offsetX,
    stickerOffsetY: p.offsetY,
    visibleShare: p.visibleShare,
    coveredBy: p.coveredBy,
    createdAt: p.createdAt.toISOString(),
  }
}

export type WallData = { stickers: Sticker[]; placements: Placement[] }

/** Everything still showing on the wall; fully covered plots never leave the DB. */
export const getWall = createServerFn({ method: "GET" }).handler(
  async (): Promise<WallData> => {
    const rows = await prisma.placement.findMany({
      where: { visibleShare: { gt: 0 } },
      orderBy: { zIndex: "asc" },
      include: { sticker: true },
    })
    const stickers = new Map<string, Sticker>()
    for (const row of rows) {
      if (!stickers.has(row.stickerId)) {
        stickers.set(
          row.stickerId,
          wallStickerFromDTO(serializeSticker(row.sticker))
        )
      }
    }
    return {
      stickers: [...stickers.values()],
      placements: rows.map(serializePlacement),
    }
  }
)

export type PlacementInput = {
  x: number
  y: number
  unitsW: number
  unitsH: number
  stickerScale: number
  rotation: number
  offsetX: number
  offsetY: number
}

function finite(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** Validate and snap a plot from form fields; null when the plot is invalid. */
export function parsePlacementInput(form: FormData): PlacementInput | null {
  const unitsW = Number(form.get("unitsW"))
  const unitsH = Number(form.get("unitsH"))
  const rawX = Number(form.get("x"))
  const rawY = Number(form.get("y"))
  if (!isValidPlot(unitsW, unitsH)) return null
  if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return null
  const { x, y } = snapPlotOrigin(rawX, rawY, unitsW, unitsH)
  const halfW = unitsToPx(unitsW) / 2
  const halfH = unitsToPx(unitsH) / 2
  return {
    x,
    y,
    unitsW,
    unitsH,
    stickerScale: Math.min(
      STICKER_SCALE_FIT_MAX,
      Math.max(STICKER_SCALE_MIN, finite(form.get("stickerScale"), 1))
    ),
    rotation: finite(form.get("rotation"), 0) % 360,
    offsetX: Math.min(halfW, Math.max(-halfW, finite(form.get("offsetX"), 0))),
    offsetY: Math.min(halfH, Math.max(-halfH, finite(form.get("offsetY"), 0))),
  }
}

type Box = { x: number; y: number; width: number; height: number }

/** Placements still showing whose plot overlaps `box`. */
function overlappingVisible(tx: Prisma.TransactionClient, box: Box) {
  return tx.$queryRaw<PlacementRecord[]>`
    SELECT * FROM placement
    WHERE "visibleShare" > 0
      AND x < ${box.x + box.width} AND x + width > ${box.x}
      AND y < ${box.y + box.height} AND y + height > ${box.y}
  `
}

/** Every placement whose plot overlaps `box`, fully covered ones included. */
function overlappingAll(tx: Prisma.TransactionClient, box: Box) {
  return tx.$queryRaw<PlacementRecord[]>`
    SELECT * FROM placement
    WHERE x < ${box.x + box.width} AND x + width > ${box.x}
      AND y < ${box.y + box.height} AND y + height > ${box.y}
  `
}

function boundsOf(plots: Box[]): Box {
  const x = Math.min(...plots.map((p) => p.x))
  const y = Math.min(...plots.map((p) => p.y))
  return {
    x,
    y,
    width: Math.max(...plots.map((p) => p.x + p.width)) - x,
    height: Math.max(...plots.map((p) => p.y + p.height)) - y,
  }
}

async function saveCoverage(
  tx: Prisma.TransactionClient,
  plots: PlacementRecord[],
  covers: PlacementRecord[]
) {
  for (const p of plots) {
    const { visible, coveredBy } = plotCoverage(p, covers)
    if (visible === p.visibleShare && coveredBy === p.coveredBy) continue
    await tx.placement.update({
      where: { id: p.id },
      data: { visibleShare: visible < 0.001 ? 0 : visible, coveredBy },
    })
  }
}

/**
 * Stick a new plot on top of the wall and refresh the visible share of every
 * plot it lands on. Wall writes are serialized so stacking order and coverage
 * can't race.
 */
export async function placeOnWall(
  tx: Prisma.TransactionClient,
  stickerId: string,
  input: PlacementInput
): Promise<Placement> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${WALL_WRITE_LOCK})`
  return serializePlacement(await insertOnTop(tx, stickerId, input))
}

/**
 * Take one of a sticker's plots off the wall and stick a new one on top, at
 * any spot and size. Without `placementId` it gives a sticker that has no
 * plot yet its first one. Null when the plot isn't this sticker's, or the
 * sticker already has a plot.
 */
export async function moveOnWall(
  tx: Prisma.TransactionClient,
  stickerId: string,
  placementId: string | null,
  input: PlacementInput
): Promise<Placement | null> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${WALL_WRITE_LOCK})`

  if (placementId) {
    const [gone] = await tx.$queryRaw<PlacementRecord[]>`
      DELETE FROM placement
      WHERE id = ${placementId} AND "stickerId" = ${stickerId}
      RETURNING *
    `
    if (!gone) return null
    await uncoverUnder(tx, gone)
  } else if (await tx.placement.count({ where: { stickerId } })) {
    return null
  }
  return serializePlacement(await insertOnTop(tx, stickerId, input))
}

async function insertOnTop(
  tx: Prisma.TransactionClient,
  stickerId: string,
  input: PlacementInput
): Promise<PlacementRecord> {
  const created = await tx.placement.create({
    data: {
      id: crypto.randomUUID(),
      stickerId,
      x: input.x,
      y: input.y,
      width: unitsToPx(input.unitsW),
      height: unitsToPx(input.unitsH),
      unitsW: input.unitsW,
      unitsH: input.unitsH,
      stickerScale: input.stickerScale,
      rotation: input.rotation,
      offsetX: input.offsetX,
      offsetY: input.offsetY,
    },
  })

  await coverUnder(tx, created)
  return created
}

/** Refresh the visible share of every plot that `top` now sits on. */
async function coverUnder(tx: Prisma.TransactionClient, top: PlacementRecord) {
  const under = (await overlappingVisible(tx, top)).filter(
    (p) => p.zIndex < top.zIndex
  )
  if (!under.length) return
  // Fully covered plots can be skipped as covers: anything they hide is
  // already hidden by the plots that cover them.
  await saveCoverage(tx, under, await overlappingVisible(tx, boundsOf(under)))
}

/**
 * Refresh every plot `gone` used to sit on. Fully covered plots count here:
 * with `gone` lifted they can show again, and hide what's below them.
 */
async function uncoverUnder(
  tx: Prisma.TransactionClient,
  gone: PlacementRecord
) {
  const under = (await overlappingAll(tx, gone)).filter(
    (p) => p.zIndex < gone.zIndex
  )
  if (!under.length) return
  await saveCoverage(tx, under, await overlappingAll(tx, boundsOf(under)))
}

export type RestoreResult =
  | { ok: true; price: number; placements: Placement[] }
  /** Coverage moved since the owner saw the price; nothing was written. */
  | { ok: false; price: number }

/**
 * Put covered plots back on top at the same spot and size. The price is read
 * under the wall lock, so it's exactly what the coverage is right now.
 */
export async function restoreOnWall(
  tx: Prisma.TransactionClient,
  stickerId: string,
  placementIds: string[],
  expectedPrice: number
): Promise<RestoreResult> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${WALL_WRITE_LOCK})`

  const rows = await tx.placement.findMany({
    where: { id: { in: placementIds }, stickerId },
    orderBy: { zIndex: "asc" },
  })
  const covered = rows.filter((p) =>
    restorePrice(p.unitsW, p.unitsH, p.visibleShare)
  )
  const price = covered.reduce(
    (sum, p) => sum + restorePrice(p.unitsW, p.unitsH, p.visibleShare),
    0
  )
  if (price !== expectedPrice) return { ok: false, price }

  const placements: Placement[] = []
  // Oldest first, so the restored plots keep their order among themselves.
  for (const p of covered) {
    const [top] = await tx.$queryRaw<PlacementRecord[]>`
      UPDATE placement
      SET "zIndex" = nextval(pg_get_serial_sequence('placement', 'zIndex')),
        "visibleShare" = 1,
        "coveredBy" = 0
      WHERE id = ${p.id}
      RETURNING *
    `
    await coverUnder(tx, top)
    placements.push(serializePlacement(top))
  }
  return { ok: true, price, placements }
}
