import { create } from "zustand"
import { buildSeedBundle } from "@/data/seed"
import type {
  DraftSticker,
  PlaceDraft,
  Placement,
  SizeTier,
  Sticker,
} from "@/domain/types"
import { WALL_SIZE, sizePx } from "@/domain/types"

const STORAGE_KEY = "sticker-wall-v2"

type Persisted = {
  stickers: Sticker[]
  placements: Placement[]
  nextZ: number
}

type WallState = {
  hydrated: boolean
  stickers: Sticker[]
  placements: Placement[]
  nextZ: number
  draftSticker: DraftSticker | null
  placeDraft: PlaceDraft | null
  selectedPlacementId: string | null
  camera: { x: number; y: number; zoom: number }
  hydrate: () => void
  setDraftSticker: (draft: DraftSticker | null) => void
  setPlaceDraft: (draft: PlaceDraft | null) => void
  selectPlacement: (id: string | null) => void
  setCamera: (partial: Partial<WallState["camera"]>) => void
  focusPlacement: (placement: Placement, zoom?: number) => void
  focusNewest: () => void
  focusRandom: () => void
  searchJump: (query: string) => Placement | null
  confirmPlacement: (
    x: number,
    y: number,
    ids?: { stickerId?: string }
  ) => Placement | null
  getSticker: (id: string) => Sticker | undefined
  placementsSorted: () => Placement[]
}

function clampPlacement(x: number, y: number, w: number, h: number) {
  return {
    x: Math.min(Math.max(0, x), WALL_SIZE - w),
    y: Math.min(Math.max(0, y), WALL_SIZE - h),
  }
}

function loadPersisted(): Persisted | null {
  if (typeof localStorage === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Persisted
  } catch {
    return null
  }
}

function savePersisted(state: Persisted) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const useWallStore = create<WallState>((set, get) => ({
  hydrated: false,
  stickers: [],
  placements: [],
  nextZ: 1,
  draftSticker: null,
  placeDraft: null,
  selectedPlacementId: null,
  camera: { x: WALL_SIZE / 2, y: WALL_SIZE / 2, zoom: 1.35 },

  hydrate: () => {
    if (get().hydrated) return
    const seed = buildSeedBundle()
    const persisted = loadPersisted()

    if (!persisted || persisted.placements.length === 0) {
      const nextZ =
        seed.placements.reduce((m, p) => Math.max(m, p.zIndex), 0) + 1
      set({
        hydrated: true,
        stickers: seed.stickers,
        placements: seed.placements,
        nextZ,
      })
      savePersisted({
        stickers: seed.stickers,
        placements: seed.placements,
        nextZ,
      })
      return
    }

    const stickerMap = new Map<string, Sticker>()
    for (const s of seed.stickers) stickerMap.set(s.id, s)
    for (const s of persisted.stickers) stickerMap.set(s.id, s)

    const seedIds = new Set(seed.placements.map((p) => p.id))
    const hasSeed = persisted.placements.some((p) => seedIds.has(p.id))
    const placements = hasSeed
      ? persisted.placements
      : [...seed.placements, ...persisted.placements]

    const nextZ = Math.max(
      persisted.nextZ,
      placements.reduce((m, p) => Math.max(m, p.zIndex), 0) + 1
    )

    set({
      hydrated: true,
      stickers: [...stickerMap.values()],
      placements,
      nextZ,
    })
  },

  setDraftSticker: (draft) => set({ draftSticker: draft }),
  setPlaceDraft: (draft) => set({ placeDraft: draft }),
  selectPlacement: (id) => set({ selectedPlacementId: id }),
  setCamera: (partial) =>
    set((s) => ({ camera: { ...s.camera, ...partial } })),

  focusPlacement: (placement, zoom = 2.2) => {
    set({
      selectedPlacementId: placement.id,
      camera: {
        x: placement.x + placement.width / 2,
        y: placement.y + placement.height / 2,
        zoom,
      },
    })
  },

  focusNewest: () => {
    const sorted = [...get().placements].sort((a, b) => b.zIndex - a.zIndex)
    const newest = sorted[0]
    if (newest) get().focusPlacement(newest, 2.4)
  },

  focusRandom: () => {
    const list = get().placements
    if (!list.length) return
    const pick = list[Math.floor(Math.random() * list.length)]
    get().focusPlacement(pick, 2.2)
  },

  searchJump: (query) => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    const { stickers, placements } = get()
    const sticker = stickers.find(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.oneLiner.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    )
    if (!sticker) return null
    const placement = [...placements]
      .filter((p) => p.stickerId === sticker.id)
      .sort((a, b) => b.zIndex - a.zIndex)[0]
    if (!placement) return null
    get().focusPlacement(placement, 2.5)
    return placement
  },

  confirmPlacement: (x, y, ids) => {
    const draft = get().placeDraft
    if (!draft) return null

    const dim = sizePx(draft.sizeTier as SizeTier)
    const pos = clampPlacement(x, y, dim, dim)
    const now = new Date().toISOString()
    const stickerId =
      ids?.stickerId ?? `stk_${crypto.randomUUID().slice(0, 8)}`
    const placementId = `plc_${crypto.randomUUID().slice(0, 8)}`
    const zIndex = get().nextZ

    const sticker: Sticker = {
      id: stickerId,
      name: draft.details.name,
      oneLiner: draft.details.oneLiner,
      url: draft.details.url,
      category: draft.details.category,
      offer: draft.details.offer,
      imageDataUrl: draft.sticker.imageDataUrl,
      outlineColor: draft.sticker.outlineColor,
      outlineThickness: draft.sticker.outlineThickness,
      createdAt: now,
    }
    const placement: Placement = {
      id: placementId,
      stickerId,
      x: pos.x,
      y: pos.y,
      width: dim,
      height: dim,
      zIndex,
      sizeTier: draft.sizeTier,
      createdAt: now,
    }

    set((s) => {
      const stickers = [...s.stickers, sticker]
      const placements = [...s.placements, placement]
      const nextZ = zIndex + 1
      savePersisted({ stickers, placements, nextZ })
      return {
        stickers,
        placements,
        nextZ,
        placeDraft: null,
        selectedPlacementId: placementId,
        camera: {
          x: placement.x + placement.width / 2,
          y: placement.y + placement.height / 2,
          zoom: 2.2,
        },
      }
    })

    return placement
  },

  getSticker: (id) => get().stickers.find((s) => s.id === id),
  placementsSorted: () =>
    [...get().placements].sort((a, b) => a.zIndex - b.zIndex),
}))
