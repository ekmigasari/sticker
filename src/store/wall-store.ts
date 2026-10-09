import { create } from "zustand"
import type {
  DraftSticker,
  PlaceDraft,
  Placement,
  Sticker,
} from "@/domain/types"
import {
  UNIT_SCALE,
  WALL_SIZE,
  snapPlotOrigin,
  uncoveredPlacements,
  unitsToPx,
} from "@/domain/types"
import { getWall } from "@/lib/wall"

/** Place flow draft survives sign-in full reloads. */
const PLACE_DRAFT_KEY = "sticker-place-draft-v1"
/** Revisiting the wall within this window reuses what's already loaded. */
const WALL_STALE_MS = 30_000

type PlaceSession = {
  draftSticker: DraftSticker | null
  placeDraft: PlaceDraft | null
}

type WallState = {
  hydrated: boolean
  /** Server-loaded wall: stickers with at least one plot still showing. */
  stickers: Sticker[]
  placements: Placement[]
  draftSticker: DraftSticker | null
  placeDraft: PlaceDraft | null
  selectedPlacementId: string | null
  camera: { x: number; y: number; zoom: number }
  /** User's grid toggle (camera controls); area editing forces it on. */
  gridVisible: boolean
  setGridVisible: (visible: boolean) => void
  /** Load (or refresh, once stale) the shared wall from the server. */
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
  /** A paid plot the server just stuck on the wall, maybe moved from `replaces`. */
  addPlacement: (
    sticker: Sticker,
    placement: Placement,
    replaces?: string
  ) => void
  /** Plots the server just moved back on top. */
  restorePlacements: (restored: Placement[]) => void
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

let wallRequest: Promise<void> | null = null
let wallLoadedAt = 0

export const useWallStore = create<WallState>((set, get) => ({
  hydrated: false,
  stickers: [],
  placements: [],
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
    if (typeof window === "undefined") return
    if (wallRequest) return
    if (get().hydrated && Date.now() - wallLoadedAt < WALL_STALE_MS) return
    if (!get().hydrated) {
      const place = loadPlaceSession()
      set({
        gridVisible: loadGridVisible(),
        draftSticker: place.draftSticker ?? get().draftSticker,
        placeDraft: place.placeDraft ?? get().placeDraft,
      })
    }
    wallRequest = getWall()
      .then(({ stickers, placements }) => {
        wallLoadedAt = Date.now()
        set({ hydrated: true, stickers, placements })
      })
      .catch(() => {
        // Offline / server error: show an empty wall rather than a spinner forever.
        set({ hydrated: true })
      })
      .finally(() => {
        wallRequest = null
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
    if (newest) get().focusPlacement(newest)
  },

  focusRandom: () => {
    const list = uncoveredPlacements(get().placements)
    if (!list.length) return
    const pick = list[Math.floor(Math.random() * list.length)]
    get().focusPlacement(pick)
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
    const placement = uncoveredPlacements(placements)
      .filter((p) => p.stickerId === sticker.id)
      .sort((a, b) => b.zIndex - a.zIndex)[0]
    if (!placement) return null
    get().focusPlacement(placement)
    return placement
  },

  addPlacement: (sticker, placement, replaces) => {
    savePlaceSession({ draftSticker: null, placeDraft: null })
    set((s) => ({
      stickers: s.stickers.some((x) => x.id === sticker.id)
        ? s.stickers
        : [...s.stickers, sticker],
      placements: [...s.placements.filter((p) => p.id !== replaces), placement],
      placeDraft: null,
      draftSticker: null,
      selectedPlacementId: placement.id,
    }))
    // Plots underneath may have changed coverage; pick that up next visit.
    wallLoadedAt = 0
  },

  restorePlacements: (restored) => {
    const byId = new Map(restored.map((p) => [p.id, p]))
    set((s) => ({
      placements: s.placements.map((p) => byId.get(p.id) ?? p),
    }))
    wallLoadedAt = 0
  },

  getSticker: (id) => get().stickers.find((s) => s.id === id),
  getStickerBySlugOrId: (slugOrId) =>
    get().stickers.find((s) => s.slug === slugOrId || s.id === slugOrId),
  placementsSorted: () =>
    [...get().placements].sort((a, b) => a.zIndex - b.zIndex),
}))
