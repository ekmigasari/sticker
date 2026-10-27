import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useBlocker, useNavigate } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import {
  CaretLeft,
  CaretUp,
  CaretUpDown,
  Copy,
  GridFour,
  Plus,
  Printer,
  Stack,
  Trash,
  X,
} from "@phosphor-icons/react"
import { TopBar } from "@/components/layout/app-chrome"
import {
  DimStepper,
  SliderRow,
  parseDim,
} from "@/components/place/sheet-controls"
import { track } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import {
  GRID_MM,
  MAKE_STICKER_ID,
  PAPER_MM_MAX,
  PAPER_GROUPS,
  PAPER_MM_MIN,
  PAPER_PRESETS,
  PRINT_MAKE_KEY,
  PRINT_NAME_MAX,
  STICKER_MM_DEFAULT,
  STICKER_MM_MIN,
  addCopy,
  draftFromMake,
  draftFromSaved,
  duplicateCopy,
  emptyDraft,
  isPaperId,
  moveCopy,
  readMakeSession,
  removeCopy,
  resizeCopy,
  snapMm,
  withAspect,
  withCustomPaper,
  withPaper,
  type MakePrintSession,
  type PaperDraft,
  type PaperId,
  type PlacedCopy,
  type PrintArt,
  type SavedPrintSheet,
} from "@/lib/print-layout"

const MM = 96 / 25.4
const EASE_OUT = [0.23, 1, 0.32, 1] as const

type Props = {
  signedIn: boolean
  from?: "make"
  sheetId?: string
  autoprint: boolean
}

type Drag = {
  id: string
  kind: "move" | "resize"
  startX: number
  startY: number
  originX: number
  originY: number
  originW: number
  pageW: number
  pageH: number
}

export function PrintStudio({ signedIn, from, sheetId, autoprint }: Props) {
  const navigate = useNavigate()
  const makeMode = from === "make"
  const guest = !signedIn && !makeMode
  const [draft, setDraft] = useState<PaperDraft>(emptyDraft)
  const [grid, setGrid] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [library, setLibrary] = useState<PrintArt[]>([])
  const [ready, setReady] = useState(() => from !== "make" && !sheetId)
  const [missing, setMissing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [baseline, setBaseline] = useState(() => snapshot(emptyDraft()))
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const dirtyRef = useRef(false)
  const [scale, setScale] = useState(1)
  const [reserve, setReserve] = useState(240)
  const [tab, setTab] = useState<Tab>("paper")
  const [panelOpen, setPanelOpen] = useState(true)
  const [noticeHidden, setNoticeHidden] = useState(false)
  const stageRef = useRef<HTMLElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const gridRef = useRef(grid)
  const seedRef = useRef<MakePrintSession | null>(null)
  const freshIds = useRef(new Set<string>())
  const aspects = useRef<Record<string, number>>({})
  const didPrint = useRef(false)
  const dirty =
    !makeMode &&
    ready &&
    (draft.copies.length > 0 || draft.savedId !== null) &&
    snapshot(draft) !== baseline
  const blocker = useBlocker({
    shouldBlockFn: ({ next }) => dirtyRef.current && next.pathname !== "/print",
    enableBeforeUnload: () => dirtyRef.current,
    withResolver: true,
  })

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  useEffect(() => {
    gridRef.current = grid
  }, [grid])

  useEffect(() => {
    if (!makeMode) return
    const timer = window.setTimeout(() => {
      const session = readMakeSession(sessionStorage.getItem(PRINT_MAKE_KEY))
      if (!session) {
        setMissing(true)
        setReady(true)
        return
      }
      seedRef.current = {
        imageUrl: session.imageUrl,
        width: session.width,
        height: session.height,
        sizeMm: session.sizeMm,
      }
      const next = draftFromMake(session)
      const snapped = {
        ...next,
        copies: next.copies.map((copy) =>
          resizeCopy(
            copy,
            next.widthMm,
            next.heightMm,
            snapMm(copy.wMm, true),
            true
          )
        ),
      }
      setDraft(snapped)
      setSelectedId(snapped.copies[0]?.id ?? null)
      setReady(true)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [makeMode])

  useEffect(() => {
    if (makeMode) return
    if (sheetId && !signedIn) {
      const next = autoprint
        ? `/print?sheet=${sheetId}&print=1`
        : `/print?sheet=${sheetId}`
      void navigate({ to: "/sign-in", search: { next } })
      return
    }
    if (!sheetId) return
    let cancel = false
    void fetch(`/api/print/sheets/${sheetId}`)
      .then(async (response) => {
        if (cancel) return
        if (response.status === 401) {
          void navigate({
            to: "/sign-in",
            search: { next: `/print?sheet=${sheetId}` },
          })
          return
        }
        if (!response.ok) {
          setMessage("That sheet isn't on this account.")
          setReady(true)
          return
        }
        const payload = (await response.json()) as { sheet: SavedPrintSheet }
        if (cancel) return
        const loaded = draftFromSaved(payload.sheet)
        setDraft(loaded)
        setBaseline(snapshot(loaded))
        setReady(true)
      })
      .catch(() => {
        if (!cancel) {
          setMessage("That sheet isn't on this account.")
          setReady(true)
        }
      })
    return () => {
      cancel = true
    }
  }, [makeMode, sheetId, signedIn, autoprint, navigate])

  useEffect(() => {
    if (!ready || !makeMode || !seedRef.current) return
    const seed = seedRef.current
    const session: MakePrintSession = {
      ...seed,
      paper: draft.paper,
      pageWidthMm: draft.widthMm,
      pageHeightMm: draft.heightMm,
      copies: draft.copies.map((copy) => ({
        id: copy.id,
        xMm: copy.xMm,
        yMm: copy.yMm,
        wMm: copy.wMm,
        hMm: copy.hMm,
      })),
    }
    try {
      sessionStorage.setItem(PRINT_MAKE_KEY, JSON.stringify(session))
    } catch {
      // Over quota: the layout just won't survive a reload.
    }
  }, [draft, ready, makeMode])

  useEffect(() => {
    if (!signedIn || makeMode) return
    let cancel = false
    void fetch("/api/print/catalog")
      .then(async (response) => {
        if (!response.ok || cancel) return
        const payload = (await response.json()) as { stickers?: PrintArt[] }
        if (!cancel) setLibrary(payload.stickers ?? [])
      })
      .catch(() => {})
    return () => {
      cancel = true
    }
  }, [signedIn, makeMode])

  useEffect(() => {
    if (!ready) return
    const stage = stageRef.current
    const sheet = sheetRef.current
    if (!stage) return
    const measure = () => {
      const bottom = (sheet?.offsetHeight ?? 0) + 32
      const top = makeMode && !noticeHidden ? 88 : 28
      const naturalW = draft.widthMm * MM
      const naturalH = draft.heightMm * MM
      const next = Math.min(
        1,
        Math.max(0, stage.clientWidth - 48) / naturalW,
        Math.max(120, stage.clientHeight - top - bottom) / naturalH
      )
      setReserve(bottom)
      setScale(next > 0 ? next : 1)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    if (sheet) observer.observe(sheet)
    return () => observer.disconnect()
  }, [draft.widthMm, draft.heightMm, ready, makeMode, noticeHidden])

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = dragRef.current
      const rect = pageRef.current?.getBoundingClientRect()
      if (!drag || !rect || rect.width <= 0 || rect.height <= 0) return
      const dx = (event.clientX - drag.startX) * (drag.pageW / rect.width)
      const dy = (event.clientY - drag.startY) * (drag.pageH / rect.height)
      const useGrid = gridRef.current
      setDraft((current) => ({
        ...current,
        copies: current.copies.map((copy) => {
          if (copy.id !== drag.id) return copy
          if (drag.kind === "resize") {
            return resizeCopy(
              copy,
              drag.pageW,
              drag.pageH,
              drag.originW + dx,
              useGrid
            )
          }
          return moveCopy(
            copy,
            drag.pageW,
            drag.pageH,
            drag.originX + dx,
            drag.originY + dy,
            useGrid
          )
        }),
      }))
    }
    function onUp() {
      dragRef.current = null
    }
    window.addEventListener("pointermove", onMove)
    window.addEventListener("pointerup", onUp)
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("pointerup", onUp)
    }
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName
      if (tag === "INPUT" || tag === "TEXTAREA") return
      if (!selectedId) return
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault()
        setDraft((current) => removeCopy(current, selectedId))
        setSelectedId(null)
        return
      }
      const step = gridRef.current ? 5 : 1
      const delta =
        event.key === "ArrowLeft"
          ? [-step, 0]
          : event.key === "ArrowRight"
            ? [step, 0]
            : event.key === "ArrowUp"
              ? [0, -step]
              : event.key === "ArrowDown"
                ? [0, step]
                : null
      if (!delta) return
      event.preventDefault()
      setDraft((current) => ({
        ...current,
        copies: current.copies.map((copy) =>
          copy.id === selectedId
            ? moveCopy(
                copy,
                current.widthMm,
                current.heightMm,
                copy.xMm + delta[0],
                copy.yMm + delta[1],
                gridRef.current
              )
            : copy
        ),
      }))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [selectedId])

  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 3200)
    return () => window.clearTimeout(timer)
  }, [message])

  useEffect(() => {
    if (!autoprint || !ready || draft.copies.length === 0) return
    const timer = window.setTimeout(() => {
      if (didPrint.current) return
      didPrint.current = true
      printPage()
    }, 700)
    return () => window.clearTimeout(timer)
  }, [autoprint, ready, draft.copies.length])

  function beginDrag(
    event: React.PointerEvent,
    copy: PlacedCopy,
    kind: Drag["kind"]
  ) {
    event.stopPropagation()
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      id: copy.id,
      kind,
      startX: event.clientX,
      startY: event.clientY,
      originX: copy.xMm,
      originY: copy.yMm,
      originW: copy.wMm,
      pageW: draft.widthMm,
      pageH: draft.heightMm,
    }
    setSelectedId(copy.id)
  }

  function toggleGrid() {
    const next = !grid
    setGrid(next)
    if (!next) return
    setDraft((current) => ({
      ...current,
      copies: current.copies.map((copy) =>
        resizeCopy(
          copy,
          current.widthMm,
          current.heightMm,
          snapMm(copy.wMm, true),
          true
        )
      ),
    }))
  }

  function placeArt(art: PrintArt, knownAspect?: number) {
    const aspect = knownAspect ?? aspects.current[art.stickerId] ?? 1
    const known = knownAspect != null || aspects.current[art.stickerId] != null
    const result = addCopy(
      draft,
      art,
      aspect,
      Math.min(STICKER_MM_DEFAULT, draft.widthMm, draft.heightMm),
      grid
    )
    if (result.error) {
      setMessage(result.error)
      return
    }
    const added = result.draft.copies.at(-1)
    if (added && !known) freshIds.current.add(added.id)
    setDraft(result.draft)
    setSelectedId(added?.id ?? null)
    setMessage(null)
  }

  function duplicateSelected() {
    if (!selectedId) return
    const result = duplicateCopy(draft, selectedId, grid)
    if (result.error) {
      setMessage(result.error)
      return
    }
    setDraft(result.draft)
    setSelectedId(result.draft.copies.at(-1)?.id ?? selectedId)
    setMessage(null)
  }

  function removeSelected() {
    if (!selectedId) return
    setDraft(removeCopy(draft, selectedId))
    setSelectedId(null)
  }

  async function save(options: { stay?: boolean } = {}): Promise<boolean> {
    setSaving(true)
    setMessage(null)
    const response = await fetch(
      draft.savedId
        ? `/api/print/sheets/${draft.savedId}`
        : "/api/print/sheets",
      {
        method: draft.savedId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim() || "Print sheet",
          paper: draft.paper,
          widthMm: draft.widthMm,
          heightMm: draft.heightMm,
          stickerMm: Math.min(
            STICKER_MM_DEFAULT,
            draft.widthMm,
            draft.heightMm
          ),
          copies: draft.copies.map((copy) => ({
            stickerId: copy.stickerId,
            xMm: copy.xMm,
            yMm: copy.yMm,
            wMm: copy.wMm,
            hMm: copy.hMm,
          })),
        }),
      }
    )
    setSaving(false)
    if (response.status === 401) {
      void navigate({ to: "/sign-in", search: { next: "/print" } })
      return false
    }
    const payload = (await response.json().catch(() => null)) as {
      error?: string
      sheet?: SavedPrintSheet
    } | null
    if (!response.ok || !payload?.sheet) {
      setMessage(payload?.error ?? "Could not save this sheet.")
      return false
    }
    const saved = draftFromSaved(payload.sheet)
    track("print_sheet_saved", { copies: saved.copies.length })
    dirtyRef.current = false
    setDraft(saved)
    setBaseline(snapshot(saved))
    setMessage("Saved to your account.")
    if (!options.stay) {
      void navigate({
        to: "/print",
        search: { sheet: payload.sheet.id },
        replace: true,
      })
    }
    return true
  }

  async function deleteSheet() {
    if (!draft.savedId) return
    setDeleting(true)
    const response = await fetch(`/api/print/sheets/${draft.savedId}`, {
      method: "DELETE",
    }).catch(() => null)
    setDeleting(false)
    setDeleteOpen(false)
    if (!response?.ok) {
      setMessage("Could not delete this paper.")
      return
    }
    dirtyRef.current = false
    void navigate({ to: "/dashboard", search: { tab: "prints" } })
  }

  function addMakeCopy() {
    const seed = seedRef.current
    if (!seed) return
    placeArt(
      {
        stickerId: MAKE_STICKER_ID,
        name: "Sticker",
        imageUrl: seed.imageUrl,
      },
      seed.width / seed.height
    )
  }

  function updateSelected(change: (copy: PlacedCopy) => PlacedCopy) {
    if (!selectedId) return
    setDraft((current) => ({
      ...current,
      copies: current.copies.map((copy) =>
        copy.id === selectedId ? change(copy) : copy
      ),
    }))
  }

  function startNew() {
    guard(() => {
      setDraft(emptyDraft())
      setBaseline(snapshot(emptyDraft()))
      setSelectedId(null)
      setMessage(null)
      void navigate({ to: "/print", search: {}, replace: true })
    })
  }

  function guard(action: () => void) {
    if (dirty) setPendingAction(() => action)
    else action()
  }

  const leaving = blocker.status === "blocked" || pendingAction !== null

  function stay() {
    if (blocker.status === "blocked") blocker.reset()
    setPendingAction(null)
  }

  function leave() {
    dirtyRef.current = false
    if (blocker.status === "blocked") blocker.proceed()
    pendingAction?.()
    setPendingAction(null)
  }

  async function saveAndLeave() {
    if (await save({ stay: true })) leave()
  }

  const selected = draft.copies.find((copy) => copy.id === selectedId) ?? null
  const naturalW = draft.widthMm * MM
  const naturalH = draft.heightMm * MM
  const landscape = draft.widthMm > draft.heightMm
  const tabs: Tab[] = makeMode ? [] : ["paper", "add"]
  const step = grid ? GRID_MM : 1

  if (!ready || missing || guest) {
    return (
      <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-white font-ui text-neutral-900 antialiased">
        <TopBar />
        <main className="flex min-h-0 flex-1 items-center justify-center px-6 pb-16">
          {!ready ? (
            <p className="text-[15px] text-neutral-500">Opening paper…</p>
          ) : (
            <div className="flex max-w-sm flex-col items-center text-center">
              <span className="grid size-16 place-items-center rounded-full bg-black/[0.045] text-neutral-800">
                <Printer weight="bold" className="size-7" />
              </span>
              <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.03em]">
                {missing ? "Print from Make" : "Print a sticker"}
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-neutral-500">
                Design a sticker in Make, then choose Print from the download
                menu. To put several of your stickers on one paper, place them
                on the wall and print from your sticker book.
              </p>
              <Link to="/make" className="nk-btn mt-6">
                Make a sticker
              </Link>
            </div>
          )}
        </main>
      </div>
    )
  }

  return (
    <div
      data-print-root
      className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#f5f5f7] font-ui text-neutral-900 antialiased"
    >
      <style>{printCss(draft.widthMm, draft.heightMm)}</style>
      <TopBar />

      <div
        data-print-hide
        className="relative z-20 flex h-12 shrink-0 items-center justify-between gap-3 px-3 sm:px-5"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Link
            to={makeMode ? "/make" : "/dashboard"}
            search={makeMode ? undefined : { tab: "prints" }}
            aria-label={makeMode ? "Back to Make" : "Back to sticker book"}
            className="press grid size-9 shrink-0 place-items-center rounded-full bg-black/[0.045] text-neutral-900 transition-colors hover:bg-black/[0.07] active:scale-[0.97]"
          >
            <CaretLeft weight="bold" className="size-4" />
          </Link>
          <h1 className="truncate text-[17px] font-semibold tracking-[-0.02em]">
            {makeMode ? "Print" : draft.name.trim() || "Print sheet"}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {makeMode ? null : (
            <>
              {draft.savedId ? (
                <button
                  type="button"
                  aria-label="Delete paper"
                  onClick={() => setDeleteOpen(true)}
                  className="press grid size-10 shrink-0 place-items-center rounded-full bg-black/[0.045] text-[#ff3b30] transition-colors hover:bg-black/[0.07] active:scale-[0.97]"
                >
                  <Trash weight="bold" className="size-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={startNew}
                className="press h-10 rounded-full bg-black/[0.045] px-4 text-[14px] font-semibold tracking-[-0.01em] text-neutral-900 transition-colors hover:bg-black/[0.07] active:scale-[0.97] max-sm:hidden"
              >
                New
              </button>
              <button
                type="button"
                onClick={() => void save()}
                disabled={
                  saving ||
                  draft.copies.length === 0 ||
                  (draft.savedId !== null && !dirty)
                }
                className="press h-10 rounded-full bg-black/[0.045] px-4 text-[14px] font-semibold tracking-[-0.01em] text-neutral-900 transition-colors hover:bg-black/[0.07] active:scale-[0.97] disabled:opacity-35"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => printPage()}
            disabled={draft.copies.length === 0}
            className="press inline-flex h-10 items-center gap-1.5 rounded-full bg-neutral-900 px-4 text-[14px] font-semibold tracking-[-0.01em] text-white transition-opacity active:scale-[0.97] disabled:opacity-35"
          >
            <Printer weight="fill" className="size-4" />
            Print
          </button>
        </div>
      </div>

      {makeMode && !noticeHidden ? (
        <div
          data-print-hide
          className="pointer-events-none absolute top-[calc(env(safe-area-inset-top)+6.75rem)] right-3 left-3 z-30 flex justify-center"
        >
          <div className="pointer-events-auto flex max-w-lg items-center gap-3 rounded-full border border-black/[0.06] bg-white/85 py-2 pr-2 pl-2.5 shadow-[0_10px_40px_-12px_rgba(0,0,0,0.18)] backdrop-blur-2xl">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-black/[0.06] text-neutral-800">
              <Stack weight="bold" className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-[-0.01em] text-neutral-900">
                Want to print several different stickers on the same paper?
              </p>
              <p className="text-[12px] leading-snug text-neutral-500">
                Put them on the wall first, then make the paper in your{" "}
                <Link
                  to={signedIn ? "/dashboard" : "/sign-in"}
                  search={signedIn ? undefined : { next: "/dashboard" }}
                  className="font-semibold text-[#0071e3] hover:underline"
                >
                  sticker book
                </Link>
                .
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNoticeHidden(true)}
              aria-label="Dismiss"
              className="press grid size-8 shrink-0 place-items-center rounded-full text-neutral-500 transition-colors hover:bg-black/[0.05] hover:text-neutral-900"
            >
              <X weight="bold" className="size-3.5" />
            </button>
          </div>
        </div>
      ) : null}

      <main
        ref={stageRef}
        data-print-stage
        className="relative min-h-0 flex-1 overflow-auto overscroll-contain"
      >
        <div
          className="flex min-h-full justify-center px-6"
          style={{
            paddingTop: makeMode && !noticeHidden ? 88 : 28,
            paddingBottom: reserve,
          }}
        >
          <div
            data-print-slot
            className="relative shrink-0"
            style={{ width: naturalW * scale, height: naturalH * scale }}
          >
            <div
              ref={pageRef}
              data-print-page
              onPointerDown={() => setSelectedId(null)}
              className="absolute top-0 left-0 overflow-hidden rounded-[2px] bg-white shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_24px_48px_-24px_rgba(0,0,0,0.3)]"
              style={{
                width: `${draft.widthMm}mm`,
                height: `${draft.heightMm}mm`,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                touchAction: "none",
              }}
            >
              {grid ? (
                <div
                  data-print-hide
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.07) 1px, transparent 1px)",
                    backgroundSize: `${GRID_MM}mm ${GRID_MM}mm`,
                  }}
                />
              ) : null}
              {draft.copies.map((copy, index) => {
                const isSelected = copy.id === selectedId
                return (
                  <div
                    key={copy.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    aria-label={copy.name}
                    onPointerDown={(event) => {
                      beginDrag(event, copy, "move")
                      setTab("paper")
                    }}
                    className="absolute cursor-grab active:cursor-grabbing"
                    style={{
                      left: `${copy.xMm}mm`,
                      top: `${copy.yMm}mm`,
                      width: `${copy.wMm}mm`,
                      height: `${copy.hMm}mm`,
                      zIndex: isSelected ? 50 : 1 + index,
                      touchAction: "none",
                    }}
                  >
                    <img
                      src={copy.imageUrl}
                      alt=""
                      draggable={false}
                      onLoad={(event) => {
                        if (!freshIds.current.has(copy.id)) return
                        freshIds.current.delete(copy.id)
                        const img = event.currentTarget
                        if (img.naturalWidth < 1 || img.naturalHeight < 1)
                          return
                        const aspect = img.naturalWidth / img.naturalHeight
                        setDraft((current) => ({
                          ...current,
                          copies: current.copies.map((item) =>
                            item.id === copy.id
                              ? withAspect(
                                  item,
                                  aspect,
                                  current.widthMm,
                                  current.heightMm,
                                  gridRef.current
                                )
                              : item
                          ),
                        }))
                      }}
                      className="pointer-events-none size-full object-contain select-none"
                    />
                    {isSelected ? (
                      <>
                        <span
                          data-print-hide
                          aria-hidden
                          className="pointer-events-none absolute inset-0 rounded-[2px] outline-2 outline-[#0071e3]"
                          style={{ outlineWidth: 2 / scale }}
                        />
                        <div
                          data-print-hide
                          className="absolute top-0 right-0 flex gap-1"
                          style={{
                            transform: `translate(0, calc(-100% - ${6 / scale}px)) scale(${1 / scale})`,
                            transformOrigin: "bottom right",
                          }}
                        >
                          <CopyAction
                            label="Duplicate sticker"
                            onClick={duplicateSelected}
                          >
                            <Copy weight="bold" className="size-3.5" />
                          </CopyAction>
                          <CopyAction
                            label="Delete sticker"
                            onClick={removeSelected}
                            danger
                          >
                            <Trash weight="bold" className="size-3.5" />
                          </CopyAction>
                        </div>
                        <button
                          type="button"
                          data-print-hide
                          aria-label="Resize sticker"
                          onPointerDown={(event) =>
                            beginDrag(event, copy, "resize")
                          }
                          className="absolute right-0 bottom-0 cursor-nwse-resize rounded-full border-2 border-[#0071e3] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.2)]"
                          style={{
                            width: 14,
                            height: 14,
                            transform: `translate(50%, 50%) scale(${1 / scale})`,
                          }}
                        />
                      </>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      <div
        data-print-hide
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-3 pb-[max(12px,env(safe-area-inset-bottom))]"
      >
        {message ? (
          <p
            role="status"
            className="w-max max-w-[90vw] rounded-full bg-neutral-900 px-4 py-2 text-[13px] font-medium text-white"
          >
            {message}
          </p>
        ) : null}
        <div
          ref={sheetRef}
          className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-[24px] border border-white/70 bg-white/75 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(0,0,0,0.08)] backdrop-blur-2xl backdrop-saturate-[1.8]"
        >
          <div
            id="print-controls"
            inert={!panelOpen}
            className={cn(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
              panelOpen
                ? "grid-rows-[1fr] opacity-100"
                : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="flex flex-col gap-1.5 px-3 pt-3 pb-1">
                {tab === "paper" ? (
                  <>
                    <Row label="Paper">
                      <PaperSelect
                        value={draft.paper}
                        onChange={(paper) =>
                          setDraft((current) =>
                            paper === "custom"
                              ? { ...current, paper }
                              : withPaper(
                                  current,
                                  paper,
                                  current.widthMm > current.heightMm
                                )
                          )
                        }
                      />
                    </Row>
                    <Row
                      label={draft.paper === "custom" ? "Size" : "Orientation"}
                    >
                      {draft.paper === "custom" ? (
                        <>
                          <NumberField
                            id="paper-w"
                            label="W"
                            value={draft.widthMm}
                            min={PAPER_MM_MIN}
                            max={PAPER_MM_MAX}
                            step={1}
                            onCommit={(value) =>
                              setDraft((current) =>
                                withCustomPaper(
                                  current,
                                  value,
                                  current.heightMm
                                )
                              )
                            }
                          />
                          <NumberField
                            id="paper-h"
                            label="H"
                            value={draft.heightMm}
                            min={PAPER_MM_MIN}
                            max={PAPER_MM_MAX}
                            step={1}
                            onCommit={(value) =>
                              setDraft((current) =>
                                withCustomPaper(current, current.widthMm, value)
                              )
                            }
                          />
                          <span className="text-[11px] font-medium text-neutral-400">
                            mm
                          </span>
                        </>
                      ) : (
                        <Segmented
                          label="Orientation"
                          value={landscape ? "landscape" : "portrait"}
                          options={[
                            { id: "portrait", label: "Portrait" },
                            { id: "landscape", label: "Landscape" },
                          ]}
                          onChange={(next) =>
                            setDraft((current) =>
                              withPaper(
                                current,
                                current.paper,
                                next === "landscape"
                              )
                            )
                          }
                        />
                      )}
                    </Row>
                    {makeMode ? null : (
                      <Row label="Name">
                        <input
                          value={draft.name}
                          maxLength={PRINT_NAME_MAX}
                          aria-label="Paper name"
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              name: event.target.value,
                            }))
                          }
                          className="h-8 min-w-0 flex-1 rounded-[10px] border border-black/[0.06] bg-black/[0.04] px-2.5 text-base font-medium tracking-[-0.01em] text-neutral-900 outline-none focus:border-black/15 focus:bg-white sm:text-[13px]"
                        />
                      </Row>
                    )}
                    {selected ? (
                      <SliderRow
                        key={selected.id}
                        label="Sticker"
                        value={Math.round(Math.max(selected.wMm, selected.hMm))}
                        min={STICKER_MM_MIN}
                        max={Math.min(draft.widthMm, draft.heightMm)}
                        step={step}
                        display={`${Math.round(Math.max(selected.wMm, selected.hMm))} mm`}
                        inputSuffix="mm"
                        ariaLabel="Sticker size"
                        onChange={(longest) =>
                          updateSelected((copy) =>
                            resizeCopy(
                              copy,
                              draft.widthMm,
                              draft.heightMm,
                              (longest * copy.wMm) /
                                Math.max(copy.wMm, copy.hMm),
                              grid
                            )
                          )
                        }
                      />
                    ) : (
                      <p className="py-1.5 text-[12px] text-neutral-500">
                        {draft.copies.length
                          ? "Tap a sticker to resize, duplicate, or delete it. Drag to move."
                          : makeMode
                            ? "Add a copy of your sticker with +."
                            : "Add one of your stickers to start."}
                      </p>
                    )}
                  </>
                ) : null}

                {tab === "add" ? (
                  library.length === 0 ? (
                    <p className="py-3 text-center text-[13px] leading-snug text-neutral-500">
                      Stickers you put on the wall show up here.
                    </p>
                  ) : (
                    <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1.5">
                      {library.map((sticker) => (
                        <li key={sticker.stickerId} className="shrink-0">
                          <button
                            type="button"
                            onClick={() => placeArt(sticker)}
                            className="press flex w-[4.5rem] flex-col items-center gap-1 rounded-[14px] bg-black/[0.04] p-1.5 text-center transition-colors hover:bg-black/[0.07] active:scale-[0.97]"
                          >
                            <img
                              src={sticker.imageUrl}
                              alt=""
                              draggable={false}
                              onLoad={(event) => {
                                const img = event.currentTarget
                                if (img.naturalWidth > 0) {
                                  aspects.current[sticker.stickerId] =
                                    img.naturalWidth / img.naturalHeight
                                }
                              }}
                              className="size-12 object-contain drop-shadow-[0_2px_3px_rgba(0,0,0,0.14)]"
                            />
                            <span className="w-full truncate text-[10px] font-medium text-neutral-600">
                              {sticker.name}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1.5">
            {tabs.length > 1 ? (
              <div
                role="group"
                aria-label="Controls"
                className="flex h-9 items-center rounded-full bg-black/[0.06] p-0.5"
              >
                {tabs.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={tab === id}
                    onClick={() => {
                      setTab(id)
                      setPanelOpen(true)
                    }}
                    className={cn(
                      "press h-8 rounded-full px-3 text-[12px] font-semibold transition-colors",
                      tab === id
                        ? "bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                        : "text-neutral-500 hover:text-neutral-800"
                    )}
                  >
                    {TAB_LABEL[id]}
                  </button>
                ))}
              </div>
            ) : (
              <span className="pl-2 text-[13px] font-semibold tracking-[-0.01em] text-neutral-900">
                Paper
              </span>
            )}
            <div className="flex-1" />
            <span className="mr-1 text-[11px] font-medium text-neutral-400 tabular-nums max-sm:hidden">
              {draft.copies.length} · {draft.widthMm}×{draft.heightMm}
            </span>
            {makeMode ? (
              <IconButton label="Add a copy" onClick={addMakeCopy}>
                <Plus weight="bold" className="size-4" />
              </IconButton>
            ) : null}
            <IconButton
              label={grid ? "Turn off grid" : "Turn on grid"}
              pressed={grid}
              onClick={toggleGrid}
            >
              <GridFour weight="bold" className="size-4" />
            </IconButton>
            <IconButton
              label={panelOpen ? "Hide controls" : "Show controls"}
              onClick={() => setPanelOpen((open) => !open)}
              expanded={panelOpen}
              controls="print-controls"
            >
              <CaretUp
                weight="bold"
                className={cn(
                  "size-4 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
                  !panelOpen && "rotate-180"
                )}
              />
            </IconButton>
          </div>
        </div>
      </div>
      <DeleteDialog
        open={deleteOpen}
        name={draft.name.trim() || "Print sheet"}
        deleting={deleting}
        onCancel={() => setDeleteOpen(false)}
        onDelete={() => void deleteSheet()}
      />
      <LeaveDialog
        open={leaving}
        saving={saving}
        canSave={draft.copies.length > 0}
        onStay={stay}
        onLeave={leave}
        onSave={() => void saveAndLeave()}
      />
    </div>
  )
}

type Tab = "paper" | "add"

const TAB_LABEL: Record<Tab, string> = {
  paper: "Paper",
  add: "Add",
}

const selectClass =
  "h-8 w-full min-w-0 appearance-none rounded-[10px] border border-black/[0.06] bg-black/[0.04] pr-7 pl-2.5 text-base font-semibold tracking-[-0.01em] text-neutral-900 outline-none focus:border-black/15 focus:bg-white sm:text-[13px]"

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-2">
      <span className="w-14 shrink-0 text-[11px] font-medium text-neutral-500">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  )
}

function SelectShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-w-0 flex-1">
      {children}
      <CaretUpDown
        weight="bold"
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-neutral-500"
      />
    </div>
  )
}

function PaperSelect({
  value,
  onChange,
}: {
  value: PaperId
  onChange: (paper: PaperId) => void
}) {
  return (
    <SelectShell>
      <select
        aria-label="Paper size"
        value={value}
        onChange={(event) => {
          const next = event.target.value
          if (isPaperId(next)) onChange(next)
        }}
        className={selectClass}
      >
        {PAPER_GROUPS.map((group) => (
          <optgroup key={group} label={group}>
            {PAPER_PRESETS.filter((preset) => preset.group === group).map(
              (preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label} · {preset.widthMm} × {preset.heightMm} mm
                </option>
              )
            )}
          </optgroup>
        ))}
        <option value="custom">Custom size</option>
      </select>
    </SelectShell>
  )
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex h-8 shrink-0 items-center rounded-full bg-black/[0.06] p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "press h-7 rounded-full px-2.5 text-[12px] font-semibold transition-colors",
            value === option.id
              ? "bg-white text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
              : "text-neutral-500 hover:text-neutral-800"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  onCommit,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  onCommit: (value: number) => void
}) {
  const [raw, setRaw] = useState<string | null>(null)
  const rounded = Math.round(value)
  return (
    <div className="flex items-center gap-1">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold text-neutral-400"
      >
        {label}
      </label>
      <DimStepper
        id={id}
        value={raw ?? String(rounded)}
        min={min}
        max={max}
        onChange={(next) => setRaw(next.replace(/[^\d]/g, "").slice(0, 3))}
        onStep={(delta) =>
          onCommit(Math.min(max, Math.max(min, rounded + delta * step)))
        }
        onFocus={() => setRaw(String(rounded))}
        onBlur={() => {
          const next = parseDim(raw ?? "")
          if (next != null) onCommit(Math.min(max, Math.max(min, next)))
          setRaw(null)
        }}
      />
    </div>
  )
}

function CopyAction({
  label,
  onClick,
  danger,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
      className={cn(
        "press grid size-7 place-items-center rounded-full border border-white/70 bg-white/90 shadow-[0_4px_12px_-4px_rgba(0,0,0,0.25),0_0_0_0.5px_rgba(0,0,0,0.08)] backdrop-blur-xl transition-colors active:scale-[0.94]",
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-neutral-800 hover:bg-white"
      )}
    >
      {children}
    </button>
  )
}

function IconButton({
  label,
  onClick,
  pressed,
  expanded,
  controls,
  children,
}: {
  label: string
  onClick: () => void
  pressed?: boolean
  expanded?: boolean
  controls?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      className={cn(
        "press grid size-8 shrink-0 place-items-center rounded-full transition-colors",
        pressed
          ? "bg-neutral-900 text-white"
          : "text-neutral-600 hover:bg-black/[0.05] hover:text-neutral-900"
      )}
    >
      {children}
    </button>
  )
}

/**
 * Safari ignores window.print() while any EventSource is open (WebKit bug
 * 195769); its print command still opens the dialog. Other browsers report the
 * command as unsupported and fall through.
 */
function printPage() {
  let handled = false
  try {
    handled = document.execCommand("print", false)
  } catch {
    handled = false
  }
  if (!handled) window.print()
}

function snapshot(draft: PaperDraft): string {
  return JSON.stringify([
    draft.name.trim(),
    draft.paper,
    draft.widthMm,
    draft.heightMm,
    draft.copies.map((copy) => [
      copy.stickerId,
      copy.xMm,
      copy.yMm,
      copy.wMm,
      copy.hMm,
    ]),
  ])
}

function DialogShell({
  open,
  id,
  onDismiss,
  children,
}: {
  open: boolean
  id: string
  onDismiss: () => void
  children: ReactNode
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          data-print-hide
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16, ease: EASE_OUT }}
        >
          <button
            type="button"
            aria-label="Cancel"
            className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
            onClick={onDismiss}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`${id}-title`}
            aria-describedby={`${id}-desc`}
            className="relative w-full max-w-[340px] rounded-[24px] border border-black/[0.06] bg-white p-5 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)]"
            initial={{ opacity: 0, transform: "scale(0.96) translateY(6px)" }}
            animate={{ opacity: 1, transform: "scale(1) translateY(0px)" }}
            exit={{ opacity: 0, transform: "scale(0.96) translateY(6px)" }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

const dialogTitle =
  "text-[17px] font-semibold tracking-[-0.02em] text-neutral-900"
const dialogText = "mt-2 text-[14px] leading-snug text-neutral-500"
const dialogButton =
  "press h-11 rounded-full px-4 text-[15px] font-semibold tracking-[-0.01em] transition-colors active:scale-[0.97] disabled:opacity-50"

function DeleteDialog({
  open,
  name,
  deleting,
  onCancel,
  onDelete,
}: {
  open: boolean
  name: string
  deleting: boolean
  onCancel: () => void
  onDelete: () => void
}) {
  return (
    <DialogShell open={open} id="delete-paper" onDismiss={onCancel}>
      <h2 id="delete-paper-title" className={dialogTitle}>
        Delete “{name}”?
      </h2>
      <p id="delete-paper-desc" className={dialogText}>
        This paper will be removed from your sticker book. Your stickers stay
        where they are.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={deleting}
          className={cn(
            dialogButton,
            "bg-black/[0.05] text-neutral-800 hover:bg-black/[0.08]"
          )}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className={cn(dialogButton, "bg-[#ff3b30] text-white")}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </DialogShell>
  )
}

function LeaveDialog({
  open,
  saving,
  canSave,
  onStay,
  onLeave,
  onSave,
}: {
  open: boolean
  saving: boolean
  canSave: boolean
  onStay: () => void
  onLeave: () => void
  onSave: () => void
}) {
  return (
    <DialogShell open={open} id="leave-paper" onDismiss={onStay}>
      <h2 id="leave-paper-title" className={dialogTitle}>
        Leave without saving?
      </h2>
      <p id="leave-paper-desc" className={dialogText}>
        This paper has changes that aren’t saved to your sticker book. They’ll
        be lost if you leave now.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        {canSave ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={cn(dialogButton, "bg-neutral-900 text-white")}
          >
            {saving ? "Saving…" : "Save and continue"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onLeave}
          disabled={saving}
          className={cn(
            dialogButton,
            "bg-black/[0.05] text-[#ff3b30] hover:bg-black/[0.08]"
          )}
        >
          Don’t save
        </button>
        <button
          type="button"
          onClick={onStay}
          disabled={saving}
          className={cn(dialogButton, "text-neutral-800 hover:bg-black/[0.04]")}
        >
          Keep editing
        </button>
      </div>
    </DialogShell>
  )
}

function printCss(widthMm: number, heightMm: number): string {
  return `
    @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }
    @media print {
      html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      header, footer, [data-print-hide] { display: none !important; }
      [data-print-root], [data-print-stage] {
        height: auto !important;
        overflow: visible !important;
        background: #fff !important;
      }
      [data-print-stage] > div { padding: 0 !important; display: block !important; }
      [data-print-slot] { width: auto !important; height: auto !important; }
      [data-print-page] {
        position: static !important;
        transform: none !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        width: ${widthMm}mm !important;
        height: ${heightMm}mm !important;
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  `
}
