import { createServerFn } from "@tanstack/react-start"
import {
  STICKER_SCALE_FIT_MAX,
  STICKER_SCALE_MIN,
  isValidPlot,
  plotCoverage,
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

  const under = (await overlappingVisible(tx, created)).filter(
    (p) => p.zIndex < created.zIndex
  )
  if (under.length) {
    const x1 = Math.min(...under.map((p) => p.x))
    const y1 = Math.min(...under.map((p) => p.y))
    const x2 = Math.max(...under.map((p) => p.x + p.width))
    const y2 = Math.max(...under.map((p) => p.y + p.height))
    // Fully covered plots can be skipped as covers: anything they hide is
    // already hidden by the plots that cover them.
    const nearby = await overlappingVisible(tx, {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
    })
    for (const p of under) {
      const { visible, coveredBy } = plotCoverage(p, nearby)
      if (visible === p.visibleShare && coveredBy === p.coveredBy) continue
      await tx.placement.update({
        where: { id: p.id },
        data: { visibleShare: visible < 0.001 ? 0 : visible, coveredBy },
      })
    }
  }

  return serializePlacement(created)
}
