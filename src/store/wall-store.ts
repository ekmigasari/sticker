import { create } from "zustand"
import type {
  DraftSticker,
  PlaceDraft,
  Placement,
  SizeTier,
  Sticker,
} from "@/domain/types"
import {
  SIZE_TIERS,
  UNIT_SCALE,
  WALL_SIZE,
  snapPlotOrigin,
  unitsToPx,
} from "@/domain/types"
import { slugifyName } from "@/lib/sticker-meta"

function normalizePlacement(p: Placement): Placement {
  if (
    typeof p.unitsW === "number" &&
    typeof p.unitsH === "number" &&
    p.unitsW > 0 &&
    p.unitsH > 0
  ) {
    return p
  }
  const legacy = p.sizeTier as SizeTier | undefined
  const units = legacy && legacy in SIZE_TIERS ? SIZE_TIERS[legacy].units : 5
  return {
    ...p,
    unitsW: units,
    unitsH: units,
    width: p.width || unitsToPx(units),
    height: p.height || unitsToPx(units),
  }
}

/** v3: empty wall (WALL_UNITS × WALL_UNITS) — no seed stickers. */
const STORAGE_KEY = "sticker-wall-v3"
/** Place flow draft survives sign-in full reloads. */
const PLACE_DRAFT_KEY = "sticker-place-draft-v1"

type Persisted = {
  stickers: Sticker[]
  placements: Placement[]
  nextZ: number
}

type PlaceSession = {
  draftSticker: DraftSticker | null
  placeDraft: PlaceDraft | null
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
  /** User's grid toggle (camera controls); area editing forces it on. */
  gridVisible: boolean
  setGridVisible: (visible: boolean) => void
  hydrate: () => void
  setDraftSticker: (draft: DraftSticker | null) => void
  setPlaceDraft: (draft: PlaceDraft | null) => void
  updatePlaceDraftSize: (unitsW: number, unitsH: number) => void
  selectPlacement: (id: string | null) => void
  setCamera: (partial: Partial<WallState["camera"]>) => void
  focusPlacement: (placement: Placement, zoom?: number) => void
  focusNewest: () => void
  focusRandom: () => void
  searchJump: (query: string) => Placement | null
  confirmPlacement: (
    x: number,
    y: number,
    ids?: { stickerId?: string; slug?: string }
  ) => Placement | null
  getSticker: (id: string) => Sticker | undefined
  getStickerBySlugOrId: (slugOrId: string) => Sticker | undefined
  placementsSorted: () => Placement[]
}

function clampPlacement(x: number, y: number, w: number, h: number) {
  return snapPlotOrigin(x, y, w / UNIT_SCALE, h / UNIT_SCALE)
}

const GRID_KEY = "sticker-wall-grid"

function loadGridVisible(): boolean {
  if (typeof localStorage === "undefined") return false
  return localStorage.getItem(GRID_KEY) === "1"
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Quota exceeded: keep the in-memory wall rather than breaking the flow.
  }
}

function loadPlaceSession(): PlaceSession {
  if (typeof sessionStorage === "undefined") {
    return { draftSticker: null, placeDraft: null }
  }
  try {
    const raw = sessionStorage.getItem(PLACE_DRAFT_KEY)
    if (!raw) return { draftSticker: null, placeDraft: null }
    const parsed = JSON.parse(raw) as PlaceSession
    return {
      draftSticker: parsed.draftSticker ?? null,
      placeDraft: parsed.placeDraft ?? null,
    }
  } catch {
    return { draftSticker: null, placeDraft: null }
  }
}

function savePlaceSession(session: PlaceSession) {
  if (typeof sessionStorage === "undefined") return
  if (!session.draftSticker && !session.placeDraft) {
    sessionStorage.removeItem(PLACE_DRAFT_KEY)
    return
  }
  try {
    sessionStorage.setItem(PLACE_DRAFT_KEY, JSON.stringify(session))
  } catch {
    // Quota exceeded: drop the stale copy; the draft still lives in memory.
    sessionStorage.removeItem(PLACE_DRAFT_KEY)
  }
}

const initialPlace = loadPlaceSession()

export const useWallStore = create<WallState>((set, get) => ({
  hydrated: false,
  stickers: [],
  placements: [],
  nextZ: 1,
  draftSticker: initialPlace.draftSticker,
  placeDraft: initialPlace.placeDraft,
  selectedPlacementId: null,
  camera: { x: WALL_SIZE / 2, y: WALL_SIZE / 2, zoom: 1 },
  gridVisible: false,

  setGridVisible: (visible) => {
    set({ gridVisible: visible })
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(GRID_KEY, visible ? "1" : "0")
    }
  },

  hydrate: () => {
    if (get().hydrated) return
    const persisted = loadPersisted()
    const place = loadPlaceSession()
    set({ gridVisible: loadGridVisible() })

    if (!persisted) {
      const empty = {
        stickers: [] as Sticker[],
        placements: [] as Placement[],
        nextZ: 1,
      }
      set({
        hydrated: true,
        ...empty,
        draftSticker: place.draftSticker,
        placeDraft: place.placeDraft,
      })
      savePersisted(empty)
      return
    }

    const stickers = persisted.stickers.map((s) => ({
      ...s,
      slug: s.slug || slugifyName(s.name) || s.id,
    }))
    const placements = persisted.placements.map(normalizePlacement)
    const nextZ = Math.max(
      persisted.nextZ,
      placements.reduce((m, p) => Math.max(m, p.zIndex), 0) + 1,
      1
    )

    set({
      hydrated: true,
      stickers,
      placements,
      nextZ,
      draftSticker: place.draftSticker ?? get().draftSticker,
      placeDraft: place.placeDraft ?? get().placeDraft,
    })
  },

  setDraftSticker: (draft) => {
    set({ draftSticker: draft })
    const { placeDraft } = get()
    savePlaceSession({ draftSticker: draft, placeDraft })
  },
  setPlaceDraft: (draft) => {
    set({ placeDraft: draft })
    const { draftSticker } = get()
    savePlaceSession({ draftSticker, placeDraft: draft })
  },
  updatePlaceDraftSize: (unitsW, unitsH) =>
    set((s) => {
      if (!s.placeDraft) return s
      const width = unitsToPx(unitsW)
      const height = unitsToPx(unitsH)
      const pos =
        s.placeDraft.x != null && s.placeDraft.y != null
          ? clampPlacement(s.placeDraft.x, s.placeDraft.y, width, height)
          : null
      const placeDraft = {
        ...s.placeDraft,
        unitsW,
        unitsH,
        ...(pos ? { x: pos.x, y: pos.y } : null),
      }
      savePlaceSession({ draftSticker: s.draftSticker, placeDraft })
      return { placeDraft }
    }),
  selectPlacement: (id) => set({ selectedPlacementId: id }),
  setCamera: (partial) => set((s) => ({ camera: { ...s.camera, ...partial } })),

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
    if (!draft?.details) return null

    const width = unitsToPx(draft.unitsW)
    const height = unitsToPx(draft.unitsH)
    // Plot is axis-aligned — never rotate for clamping / coverage.
    const pos = clampPlacement(x, y, width, height)
    const now = new Date().toISOString()
    const stickerId = ids?.stickerId ?? `stk_${crypto.randomUUID().slice(0, 8)}`
    const slug = ids?.slug ?? slugifyName(draft.details.name) ?? stickerId
    const placementId = `plc_${crypto.randomUUID().slice(0, 8)}`
    const zIndex = get().nextZ
    const stickerScale = draft.stickerScale ?? 1
    const rotation = draft.rotation ?? 0
    const stickerOffsetX = draft.stickerOffsetX ?? 0
    const stickerOffsetY = draft.stickerOffsetY ?? 0

    const sticker: Sticker = {
      id: stickerId,
      slug,
      name: draft.details.name,
      oneLiner: draft.details.oneLiner,
      url: draft.details.url,
      category: draft.details.category,
      offer: draft.details.offer,
      imageDataUrl: draft.sticker.imageDataUrl,
      outlineColor: draft.sticker.outlineColor,
      outlineThickness: draft.sticker.outlineThickness,
      widthPx: draft.sticker.widthPx,
      heightPx: draft.sticker.heightPx,
      createdAt: now,
    }
    const placement: Placement = {
      id: placementId,
      stickerId,
      x: pos.x,
      y: pos.y,
      width,
      height,
      zIndex,
      unitsW: draft.unitsW,
      unitsH: draft.unitsH,
      stickerScale,
      rotation,
      stickerOffsetX,
      stickerOffsetY,
      createdAt: now,
    }

    set((s) => {
      const stickers = [...s.stickers, sticker]
      const placements = [...s.placements, placement]
      const nextZ = zIndex + 1
      savePersisted({ stickers, placements, nextZ })
      savePlaceSession({ draftSticker: null, placeDraft: null })
      return {
        stickers,
        placements,
        nextZ,
        placeDraft: null,
        draftSticker: null,
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
  getStickerBySlugOrId: (slugOrId) =>
    get().stickers.find((s) => s.slug === slugOrId || s.id === slugOrId),
  placementsSorted: () =>
    [...get().placements].sort((a, b) => a.zIndex - b.zIndex),
}))
