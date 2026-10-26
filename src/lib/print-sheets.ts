import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { stickerImageUrl } from "@/lib/sticker-api"
import {
  PRINT_SHEETS_MAX,
  type PrintArt,
  type PrintSheetSummary,
  type SavedPrintSheet,
  type SheetInput,
  isPaperId,
} from "@/lib/print-layout"

type StickerGate = {
  id: string
  slug: string
  name: string
  archivedAt: Date | null
  hiddenAt: Date | null
  userId: string
}

/** The owner's stickers, including archived ones. Taken-down stickers stay off. */
export function canPrintSticker(
  sticker: StickerGate,
  viewerId: string
): boolean {
  if (sticker.hiddenAt) return false
  return sticker.userId === viewerId
}

function toArt(sticker: {
  id: string
  name: string
  archivedAt: Date | null
}): PrintArt {
  return {
    stickerId: sticker.id,
    name: sticker.name,
    imageUrl: stickerImageUrl(sticker.id),
    archived: Boolean(sticker.archivedAt),
  }
}

const stickerSelect = {
  id: true,
  slug: true,
  name: true,
  archivedAt: true,
  hiddenAt: true,
  userId: true,
} satisfies Prisma.StickerSelect

export async function listOwnPrintStickers(
  userId: string,
  q: string
): Promise<PrintArt[]> {
  const query = q.trim()
  const stickers = await prisma.sticker.findMany({
    where: {
      userId,
      hiddenAt: null,
      ...(query
        ? {
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { oneLiner: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { id: true, name: true, archivedAt: true },
  })
  return stickers.map(toArt)
}

function toSaved(
  sheet: {
    id: string
    name: string
    paper: string
    widthMm: number
    heightMm: number
    stickerMm: number
    updatedAt: Date
    items: Array<{
      id: string
      xMm: number
      yMm: number
      wMm: number
      hMm: number
      sort: number
      sticker: StickerGate
    }>
  },
  viewerId: string
): SavedPrintSheet {
  return {
    id: sheet.id,
    name: sheet.name,
    paper: isPaperId(sheet.paper) ? sheet.paper : "custom",
    widthMm: sheet.widthMm,
    heightMm: sheet.heightMm,
    stickerMm: sheet.stickerMm,
    updatedAt: sheet.updatedAt.toISOString(),
    copies: sheet.items
      .filter((item) => canPrintSticker(item.sticker, viewerId))
      .sort((a, b) => a.sort - b.sort)
      .map((item) => ({
        id: item.id,
        stickerId: item.sticker.id,
        name: item.sticker.name,
        imageUrl: stickerImageUrl(item.sticker.id),
        xMm: item.xMm,
        yMm: item.yMm,
        wMm: item.wMm,
        hMm: item.hMm,
      })),
  }
}

const sheetInclude = {
  items: {
    orderBy: { sort: "asc" as const },
    include: { sticker: { select: stickerSelect } },
  },
}

async function assertPrintable(userId: string, stickerIds: string[]) {
  const unique = [...new Set(stickerIds)]
  const stickers = await prisma.sticker.findMany({
    where: { id: { in: unique } },
    select: stickerSelect,
  })
  const byId = new Map(stickers.map((sticker) => [sticker.id, sticker]))
  for (const id of unique) {
    const sticker = byId.get(id)
    if (!sticker || !canPrintSticker(sticker, userId)) {
      return "A sticker on this sheet can't be printed."
    }
  }
  return null
}

export async function listPrintSheets(
  userId: string
): Promise<PrintSheetSummary[]> {
  const sheets = await prisma.printSheet.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: PRINT_SHEETS_MAX,
    include: sheetInclude,
  })
  return sheets.map((sheet) => {
    const items = sheet.items.filter((item) =>
      canPrintSticker(item.sticker, userId)
    )
    return {
      id: sheet.id,
      name: sheet.name,
      widthMm: sheet.widthMm,
      heightMm: sheet.heightMm,
      stickerCount: items.length,
      updatedAt: sheet.updatedAt.toISOString(),
      preview: items.map((item) => ({
        id: item.id,
        imageUrl: stickerImageUrl(item.sticker.id),
        xMm: item.xMm,
        yMm: item.yMm,
        wMm: item.wMm,
        hMm: item.hMm,
      })),
    }
  })
}

export async function getPrintSheet(
  userId: string,
  id: string
): Promise<SavedPrintSheet | null> {
  const sheet = await prisma.printSheet.findFirst({
    where: { id, userId },
    include: sheetInclude,
  })
  return sheet ? toSaved(sheet, userId) : null
}

function itemRows(sheetId: string, copies: SheetInput["copies"]) {
  return copies.map((copy, sort) => ({
    id: crypto.randomUUID(),
    sheetId,
    stickerId: copy.stickerId,
    xMm: copy.xMm,
    yMm: copy.yMm,
    wMm: copy.wMm,
    hMm: copy.hMm,
    sort,
  }))
}

export async function createPrintSheet(
  userId: string,
  input: SheetInput
): Promise<{ sheet: SavedPrintSheet } | { error: string; status: number }> {
  const blocked = await assertPrintable(
    userId,
    input.copies.map((copy) => copy.stickerId)
  )
  if (blocked) return { error: blocked, status: 400 }

  const count = await prisma.printSheet.count({ where: { userId } })
  if (count >= PRINT_SHEETS_MAX) {
    return {
      error: `You can save ${PRINT_SHEETS_MAX} sheets. Delete one to save another.`,
      status: 400,
    }
  }

  const id = crypto.randomUUID()
  await prisma.$transaction([
    prisma.printSheet.create({
      data: {
        id,
        userId,
        name: input.name,
        paper: input.paper,
        widthMm: input.widthMm,
        heightMm: input.heightMm,
        stickerMm: input.stickerMm,
      },
    }),
    prisma.printSheetItem.createMany({ data: itemRows(id, input.copies) }),
  ])
  const sheet = await getPrintSheet(userId, id)
  if (!sheet) return { error: "Could not save this sheet.", status: 500 }
  return { sheet }
}

export async function updatePrintSheet(
  userId: string,
  id: string,
  input: SheetInput
): Promise<{ sheet: SavedPrintSheet } | { error: string; status: number }> {
  const existing = await prisma.printSheet.findFirst({
    where: { id, userId },
    select: { id: true },
  })
  if (!existing) {
    return { error: "That sheet isn't on this account.", status: 404 }
  }

  const blocked = await assertPrintable(
    userId,
    input.copies.map((copy) => copy.stickerId)
  )
  if (blocked) return { error: blocked, status: 400 }

  await prisma.$transaction(async (tx) => {
    await tx.printSheet.update({
      where: { id },
      data: {
        name: input.name,
        paper: input.paper,
        widthMm: input.widthMm,
        heightMm: input.heightMm,
        stickerMm: input.stickerMm,
      },
    })
    await tx.printSheetItem.deleteMany({ where: { sheetId: id } })
    await tx.printSheetItem.createMany({ data: itemRows(id, input.copies) })
  })
  const sheet = await getPrintSheet(userId, id)
  if (!sheet) return { error: "Could not save this sheet.", status: 500 }
  return { sheet }
}

export async function deletePrintSheet(
  userId: string,
  id: string
): Promise<{ error: string; status: number } | null> {
  const existing = await prisma.printSheet.findFirst({
    where: { id, userId },
    select: { id: true },
  })
  if (!existing) {
    return { error: "That sheet isn't on this account.", status: 404 }
  }
  await prisma.printSheet.delete({ where: { id } })
  return null
}
