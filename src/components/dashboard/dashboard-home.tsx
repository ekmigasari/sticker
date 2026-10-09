import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import {
  ArrowUp,
  CaretLeft,
  CaretRight,
  CurrencyDollar,
  PencilSimple,
  Plus,
  SquaresFour,
  Sticker as StickerIcon,
  X,
  type Icon,
} from "@phosphor-icons/react"
import {
  AnimatePresence,
  animate,
  motion,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react"
import { ProfileAvatar } from "@/components/profile-avatar"
import { PeelToVisit } from "@/components/stickers/peel-to-visit"
import { useMoveSpot } from "@/components/place/use-move-spot"
import { RestoreSheet } from "@/components/stickers/restore-sheet"
import { needsRestore, wallStatus } from "@/components/stickers/wall-status"
import {
  isHoloFinish,
  RESTORE_MIN_PRICE,
  type RestoreQuote,
} from "@/domain/types"
import type { MySticker } from "@/lib/stickers"
import { cn } from "@/lib/utils"
import { FormSheet } from "./form-sheet"
import { ProfileSheet, type Profile } from "./profile-sheet"

type Tab = "book" | "wall" | "archived"

/** `page` counts spreads (two book pages, 12 slots), 1-based. */
export type BookView = { page: number; tab: Tab }

const PER_PAGE = 6
/** Gap between the art and the slot edge, as a share of the slot width. */
const ART_INSET = 0.07

type Slot =
  | { kind: "sticker"; no: number; sticker: MySticker }
  | { kind: "next"; no: number }
  | { kind: "empty"; no?: number }

type Page = { slots: Slot[]; number: number; spreadOnly: boolean }

type Entry = { sticker: MySticker; no: number }

function numbered(stickers: MySticker[]): Entry[] {
  return stickers.map((sticker, i) => ({ sticker, no: i + 1 }))
}

/**
 * Every page is a full grid of PER_PAGE slots so all views share one layout.
 * `nextNo` adds the "make a sticker" slot; blanks after it keep counting, while
 * blanks in a filtered view stay unnumbered.
 */
function buildPages(entries: Entry[], nextNo?: number): Page[] {
  const slots: Slot[] = entries.map(({ sticker, no }) => ({
    kind: "sticker",
    no,
    sticker,
  }))
  if (nextNo !== undefined) slots.push({ kind: "next", no: nextNo })
  const blank = (): Slot => ({
    kind: "empty",
    no: nextNo === undefined ? undefined : slots.length + 1,
  })
  if (!slots.length) slots.push(blank())
  while (slots.length % PER_PAGE) slots.push(blank())
  // Pad the last spread to two pages so turning never changes the book's size.
  const spreadOnlyFrom = slots.length
  if ((slots.length / PER_PAGE) % 2) {
    for (let i = 0; i < PER_PAGE; i++) slots.push(blank())
  }

  const pages: Page[] = []
  for (let i = 0; i < slots.length; i += PER_PAGE) {
    pages.push({
      slots: slots.slice(i, i + PER_PAGE),
      number: pages.length + 1,
      spreadOnly: i >= spreadOnlyFrom,
    })
  }
  return pages
}

function tiltFor(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return ((Math.abs(hash) % 9) - 4) * 1.1
}

const compact = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
})

/** Short enough to fit a phone-width stat tile. */
function statNumber(n: number) {
  return n >= 10_000 ? compact.format(n) : n.toLocaleString("en-US")
}

function slotLabel(no: number) {
  return `No. ${String(no).padStart(2, "0")}`
}

const PAPER: React.CSSProperties = {
  backgroundColor: "#fbf8f1",
  backgroundImage:
    "radial-gradient(rgba(140,115,70,0.16) 1px, transparent 1.3px)",
  backgroundSize: "22px 22px",
  backgroundPosition: "11px 11px",
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // Measure before paint so content sized from the width never pops in.
    setWidth(el.offsetWidth)
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, width] as const
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  )
}

export function DashboardHome({
  user,
  stickers,
  view,
  onViewChange,
}: {
  user: Profile
  stickers: MySticker[]
  view: BookView
  onViewChange: (view: BookView) => void
}) {
  const reduce = useReducedMotion()
  const [editingProfile, setEditingProfile] = useState(false)
  const bookRef = useRef<HTMLDivElement>(null)

  const ordered = [...stickers].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  )
  // Oldest first so slot numbers stay put as the book grows.
  const live = numbered(ordered.filter((s) => !s.archivedAt))
  const onWall = live.filter((e) => e.sticker.onWall > 0)
  const archived = numbered(ordered.filter((s) => s.archivedAt))
  const activeTab: Tab =
    view.tab === "archived" && archived.length
      ? "archived"
      : view.tab === "wall" && live.length
        ? "wall"
        : "book"
  const pages =
    activeTab === "archived"
      ? buildPages(archived)
      : activeTab === "wall"
        ? buildPages(onWall)
        : buildPages(live, live.length + 1)
  const wallEmpty = activeTab === "wall" && onWall.length === 0
  const spreads: Page[][] = []
  for (let i = 0; i < pages.length; i += 2) spreads.push(pages.slice(i, i + 2))
  const spreadIndex = Math.min(Math.max(view.page, 1), spreads.length) - 1
  const spread = spreads[spreadIndex]

  const spots = stickers.reduce((sum, s) => sum + s.onWall, 0)
  const spent = stickers.reduce((sum, s) => sum + s.totalSpent, 0)

  const restorable = live.flatMap(({ sticker }): BookRestore[] =>
    sticker.restore ? [{ sticker, quote: sticker.restore }] : []
  )
  const covered = restorable.filter(({ sticker }) =>
    needsRestore(sticker.visibleShare)
  )
  const [picking, setPicking] = useState<BookRestore[] | null>(null)
  const [restoring, setRestoring] = useState<BookRestore | null>(null)
  const { moveSpot } = useMoveSpot()
  const restoringIds = restoring?.quote.placementIds
  const restoringSpot =
    restoringIds?.length === 1
      ? restoring?.sticker.spots.find((s) => s.id === restoringIds[0])
      : undefined

  /** One choice skips the picker and goes straight to checkout. */
  function startRestore(choices: BookRestore[]) {
    if (choices.length === 1) setRestoring(choices[0])
    else setPicking(choices)
  }

  function turn(delta: 1 | -1) {
    const next = spreadIndex + delta
    if (next < 0 || next >= spreads.length) return
    onViewChange({ tab: activeTab, page: next + 1 })
    // The pager sits under the book; bring the new spread's top back into view.
    const book = bookRef.current
    if (book && book.getBoundingClientRect().top < 0) {
      book.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      })
    }
  }

  const turnRef = useRef(turn)
  useEffect(() => {
    turnRef.current = turn
  })

  useEffect(() => {
    if (editingProfile) return
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping(event.target)) return
      if (event.key === "ArrowRight") turnRef.current(1)
      if (event.key === "ArrowLeft") turnRef.current(-1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [editingProfile])

  const realPages = pages.filter((p) => !p.spreadOnly).length
  const shown = spread.filter((p) => !p.spreadOnly)
  const pageLabel =
    shown.length === 2
      ? `Pages ${shown[0].number}–${shown[1].number} of ${realPages}`
      : `Page ${shown[0]?.number ?? 1} of ${realPages}`
  const filters: { value: Tab; label: string; count: number }[] = [
    { value: "book", label: "All", count: live.length },
    { value: "wall", label: "On the wall", count: onWall.length },
  ]
  if (archived.length) {
    filters.push({
      value: "archived",
      label: "Archived",
      count: archived.length,
    })
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-8 sm:pt-10">
      <BookCover user={user} onEditProfile={() => setEditingProfile(true)}>
        <dl className="mt-4 inline-grid grid-cols-[repeat(3,1fr)] divide-x divide-black/[0.07] rounded-[18px] bg-[#f5f5f7] py-3">
          <Stat
            icon={StickerIcon}
            color="#ff9f0a"
            label="Collected"
            value={statNumber(live.length)}
          />
          <Stat
            icon={SquaresFour}
            color="#34c759"
            label="On the wall"
            value={statNumber(spots)}
          />
          <Stat
            icon={CurrencyDollar}
            color="#0a84ff"
            label="Spent"
            value={`$${statNumber(spent)}`}
          />
        </dl>
      </BookCover>

      <CoveredBanner
        covered={covered.map((t) => t.sticker)}
        onRestore={() => startRestore(covered)}
      />

      {live.length || archived.length ? (
        <div className="mt-8 flex justify-center sm:mt-10 sm:justify-start">
          <Segmented
            value={activeTab}
            onChange={(tab) => onViewChange({ tab, page: 1 })}
            options={filters}
          />
        </div>
      ) : null}

      <div ref={bookRef} className="mt-6 scroll-mt-24 sm:mt-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
          >
            <FlipBook
              spreads={spreads}
              index={spreadIndex}
              title={
                activeTab === "archived"
                  ? "Archived"
                  : activeTab === "wall"
                    ? "On the wall"
                    : "Sticker Book"
              }
              firstSticker={live.length === 0}
              overlay={wallEmpty ? <WallEmpty /> : null}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {spreads.length > 1 ? (
        <Pager
          label={pageLabel}
          canBack={spreadIndex > 0}
          canForward={spreadIndex < spreads.length - 1}
          onTurn={turn}
        />
      ) : null}

      <ProfileSheet
        open={editingProfile}
        onOpenChange={setEditingProfile}
        profile={user}
      />
      <RestorePicker
        choices={picking}
        onOpenChange={(open) => {
          if (!open) setPicking(null)
        }}
        onPick={(target) => {
          setPicking(null)
          setRestoring(target)
        }}
      />
      <RestoreSheet
        target={restoring}
        onOpenChange={(open) => {
          if (!open) setRestoring(null)
        }}
        onMove={
          restoring && restoringSpot
            ? () => {
                setRestoring(null)
                void moveSpot(restoring.sticker, restoringSpot)
              }
            : undefined
        }
      />
    </div>
  )
}

type BookRestore = { sticker: MySticker; quote: RestoreQuote }

/** Most covered first: those lose the most if nobody acts. */
function byNeed(a: BookRestore, b: BookRestore) {
  return (
    (a.sticker.visibleShare ?? 0) - (b.sticker.visibleShare ?? 0) ||
    b.quote.price - a.quote.price
  )
}

function RestorePicker({
  choices,
  onOpenChange,
  onPick,
}: {
  choices: BookRestore[] | null
  onOpenChange: (open: boolean) => void
  onPick: (target: BookRestore) => void
}) {
  // Keep the list while the sheet animates closed.
  const [shown, setShown] = useState(choices)
  if (choices && choices !== shown) setShown(choices)
  const sorted = [...(choices ?? shown ?? [])].sort(byNeed)

  return (
    <FormSheet
      open={choices != null}
      onOpenChange={onOpenChange}
      title="Restore to top"
    >
      <p className="text-[14px] leading-snug tracking-[-0.01em] text-neutral-500">
        Same spot, same size, back on top. You only pay for the covered units,
        at least ${RESTORE_MIN_PRICE} a spot.
      </p>
      <ul className="-mx-2 mt-3">
        {sorted.map((target) => {
          const { sticker, quote } = target
          const status = wallStatus(sticker.visibleShare)
          return (
            <li key={sticker.id}>
              <button
                type="button"
                onClick={() => onPick(target)}
                className="press flex w-full items-center gap-3 rounded-[16px] px-2 py-2.5 text-left transition-colors hover:bg-black/[0.04]"
              >
                <img
                  src={sticker.imageUrl}
                  alt=""
                  className="size-12 shrink-0 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.14)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold tracking-[-0.01em] text-neutral-900">
                    {sticker.name}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-neutral-500">
                    <span
                      aria-hidden
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        status.dot
                      )}
                    />
                    <span className="truncate">{status.label}</span>
                  </span>
                </span>
                <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-neutral-900 px-3.5 text-[13px] font-semibold tracking-[-0.01em] text-white tabular-nums">
                  Restore
                  <span className="font-medium text-white/60">
                    ${quote.price.toLocaleString("en-US")}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </FormSheet>
  )
}

const DISMISSED_KEY = "sticker-covered-dismissed"
const noSubscribe = () => () => {}

/**
 * Nudge when stickers slip under newer ones. Dismissing hides it for this
 * session until a different set of stickers gets covered.
 */
function CoveredBanner({
  covered,
  onRestore,
}: {
  covered: MySticker[]
  onRestore: () => void
}) {
  const signature = covered
    .map((s) => s.id)
    .sort()
    .join(",")
  /** Undefined on the server, so the banner only ever renders client-side. */
  const stored = useSyncExternalStore(
    noSubscribe,
    () => sessionStorage.getItem(DISMISSED_KEY),
    () => undefined
  )
  const [dismissedNow, setDismissedNow] = useState<string | null>(null)

  if (
    !covered.length ||
    stored === undefined ||
    stored === signature ||
    dismissedNow === signature
  ) {
    return null
  }

  const count = covered.length
  const title =
    count === 1
      ? `${covered[0].name} is getting covered`
      : `${count} stickers are getting covered`

  return (
    <motion.section
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      aria-label="Covered stickers"
      className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[22px] bg-[#fff5e6] p-4 ring-1 ring-[#ff9f0a]/20 sm:mt-10 sm:flex-nowrap sm:pr-3"
    >
      <div className="flex shrink-0 -space-x-3">
        {covered.slice(0, 3).map((s, i) => (
          <img
            key={s.id}
            src={s.imageUrl}
            alt=""
            style={{ rotate: `${(i - 1) * 8}deg` }}
            className="size-11 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.18)]"
          />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-neutral-900">
          {title}
        </p>
        <p className="text-[13px] leading-snug text-[#8c6a2f]">
          Put {count === 1 ? "it" : "them"} back on top before{" "}
          {count === 1 ? "it disappears" : "they disappear"}.
        </p>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto">
        <button
          type="button"
          onClick={onRestore}
          className="nk-btn flex-1 sm:flex-none"
        >
          <ArrowUp weight="bold" className="size-4" />
          Restore
        </button>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => {
            sessionStorage.setItem(DISMISSED_KEY, signature)
            setDismissedNow(signature)
          }}
          className="press grid size-11 shrink-0 place-items-center rounded-full text-[#8c6a2f] transition-colors hover:bg-[#ff9f0a]/10"
        >
          <X weight="bold" className="size-4" />
        </button>
      </div>
    </motion.section>
  )
}

function Stat({
  icon: IconComponent,
  color,
  label,
  value,
}: {
  icon: Icon
  color: string
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col-reverse px-4 text-left sm:px-5">
      <dt className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap text-[#86868b] sm:text-[12px]">
        <IconComponent
          aria-hidden
          weight="fill"
          color={color}
          className="size-3.5"
        />
        {label}
      </dt>
      <dd className="text-[19px] leading-none font-semibold tracking-[-0.03em] text-neutral-900 tabular-nums sm:text-[22px]">
        {value}
      </dd>
    </div>
  )
}

function WallEmpty() {
  return (
    <div className="flex max-w-sm flex-col items-center rounded-[22px] bg-white/90 px-6 py-7 text-center shadow-[0_20px_40px_-20px_rgba(60,40,10,0.35),0_0_0_1px_rgba(60,40,10,0.06)] backdrop-blur-md">
      <span className="grid size-11 place-items-center rounded-full bg-[#34c759]/12 text-[#34c759]">
        <SquaresFour weight="fill" className="size-5" />
      </span>
      <p className="mt-4 text-[18px] font-semibold tracking-[-0.025em] text-neutral-900">
        Nothing on the wall yet
      </p>
      <p className="mt-1 text-[14px] tracking-[-0.01em] text-[#86868b]">
        Claim a spot for one of your stickers and it will show up here.
      </p>
      <Link to="/" className="nk-btn mt-5">
        Go to the wall
      </Link>
    </div>
  )
}

function BookCover({
  user,
  onEditProfile,
  children,
}: {
  user: Profile
  onEditProfile: () => void
  children?: React.ReactNode
}) {
  const displayName = user.name.trim() || user.email.split("@")[0]

  return (
    <header className="flex flex-col items-center gap-6 sm:grid sm:grid-cols-[auto_1fr] sm:gap-x-7 sm:gap-y-5 lg:grid-cols-[auto_1fr_auto]">
      <button
        type="button"
        onClick={onEditProfile}
        aria-label="Edit profile"
        className="group relative shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3] focus-visible:ring-offset-4"
      >
        <ProfileAvatar
          name={user.name}
          email={user.email}
          image={user.image}
          className="size-24 -rotate-6 text-[30px] shadow-[0_12px_24px_-10px_rgba(0,0,0,0.4),0_0_0_1px_rgba(0,0,0,0.04)] ring-[5px] ring-white transition-[rotate,scale] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.03] group-hover:rotate-0 sm:size-28 sm:text-[34px]"
        />
        <span className="absolute right-0 bottom-0 grid size-8 place-items-center rounded-full bg-white text-neutral-700 opacity-0 shadow-[0_4px_10px_rgba(0,0,0,0.18)] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
          <PencilSimple weight="bold" className="size-3.5" />
        </span>
      </button>

      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="text-[12px] font-semibold tracking-[0.14em] text-[#b07a2a] uppercase">
          Sticker Book
        </p>
        <h1 className="mt-1 truncate text-[36px] leading-[1.05] font-semibold tracking-[-0.04em] text-neutral-900 sm:text-[48px]">
          {displayName}
        </h1>
        {children}
      </div>

      <div className="flex shrink-0 flex-col items-center gap-2 sm:col-start-2 sm:items-start lg:col-start-3 lg:items-end">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onEditProfile}
            aria-label="Edit profile"
            title="Edit profile"
            className="press grid size-11 shrink-0 place-items-center rounded-full bg-black/[0.06] text-neutral-900 transition-colors hover:bg-black/[0.09]"
          >
            <PencilSimple weight="bold" className="size-[18px]" />
          </button>
          <Link to="/make" className="nk-btn">
            <Plus weight="bold" className="size-4" />
            Make a sticker
          </Link>
        </div>
      </div>
    </header>
  )
}

const WIDE = "(min-width: 1024px)"
/** Ease-in-out reads like a page lifting, travelling, then settling. */
const TURN = { duration: 0.85, ease: [0.645, 0.045, 0.355, 1] as const }

function useMediaQuery(query: string) {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => list.removeEventListener("change", onChange)
    },
    [query]
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}

type Side = "left" | "right"

/** A page mid-turn: the edge it hinges on, and its angle relative to the leaf. */
type SheetTurn = { hinge: Side; offset: number }

type Sheet = { page: Page; slot: number; turn: SheetTurn | null }

// Explicit cells let a turning page overlap the one it covers.
const SHEET_CELL = [
  "col-start-1 row-start-1",
  "col-start-1 row-start-2 lg:col-start-2 lg:row-start-1",
]
const SHEET_ROUND = [
  "rounded-[24px] lg:rounded-l-[26px] lg:rounded-r-none",
  "rounded-[24px] lg:rounded-l-none lg:rounded-r-[26px]",
]

/**
 * Renders one spread and turns pages like a book when `index` changes: on
 * wide screens a leaf hinges on the spine, its back showing the next spread's
 * page; on narrow screens the stacked pages turn away together.
 *
 * Every page stays a keyed child of the same grid for the whole turn, so its
 * stickers never remount (which would flash them as they re-measure).
 */
function FlipBook({
  spreads,
  index,
  title,
  firstSticker,
  overlay,
}: {
  spreads: Page[][]
  index: number
  title: string
  firstSticker: boolean
  overlay?: React.ReactNode
}) {
  const reduce = useReducedMotion()
  const wide = useMediaQuery(WIDE)
  const [current, setCurrent] = useState(index)
  const [turning, setTurning] = useState<{ from: number; to: number } | null>(
    null
  )
  const [turned, setTurned] = useState(false)

  if (index !== current) {
    setCurrent(index)
    setTurned(true)
    setTurning(reduce ? null : { from: current, to: index })
  }

  /** Leaf angle: 0 lies in place, ±180 has crossed the spine. */
  const angle = useMotionValue(0)
  const from = turning ? spreads[turning.from] : undefined
  const to = turning ? spreads[turning.to] : undefined
  const forward = turning ? turning.to > turning.from : true
  const [startDeg, endDeg] =
    !from || !to
      ? [0, 0]
      : wide
        ? [0, forward ? -180 : 180]
        : forward
          ? [0, -180]
          : [-180, 0]

  useLayoutEffect(() => {
    if (!turning) return
    angle.jump(startDeg)
    const controls = animate(angle, endDeg, {
      ...TURN,
      onComplete: () => setTurning(null),
    })
    return () => controls.stop()
  }, [turning, angle, startDeg, endDeg])

  const still = (page: Page, slot: number): Sheet => ({
    page,
    slot,
    turn: null,
  })
  let sheets: Sheet[]
  if (!from || !to) {
    sheets = spreads[index].map(still)
  } else if (wide) {
    // The leaf's front is the outgoing page beside the spine; its back is the
    // incoming page for the other side, starting face-down over the front.
    sheets = forward
      ? [
          still(from[0], 0),
          { page: from[1], slot: 1, turn: { hinge: "left", offset: 0 } },
          { page: to[0], slot: 0, turn: { hinge: "right", offset: 180 } },
          still(to[1], 1),
        ]
      : [
          still(to[0], 0),
          { page: from[0], slot: 0, turn: { hinge: "right", offset: 0 } },
          { page: to[1], slot: 1, turn: { hinge: "left", offset: -180 } },
          still(from[1], 1),
        ]
  } else {
    // Narrow: the outgoing pages turn away to the left, or the incoming ones
    // swing back in from the left when going back.
    const [moving, under] = forward ? [from, to] : [to, from]
    sheets = [
      ...under.map(still),
      ...moving.map((page, slot): Sheet => ({
        page,
        slot,
        turn: { hinge: "left", offset: 0 },
      })),
    ]
  }
  // A stable order lets React keep each page's DOM in place between turns.
  sheets.sort((a, b) => a.page.number - b.page.number)

  return (
    <Spread overlay={overlay} turning={Boolean(from && to)}>
      {sheets.map(({ page, slot, turn }) => (
        <TurnSheet key={page.number} angle={angle} slot={slot} turn={turn}>
          <BookPage
            page={page}
            side={slot === 0 ? "left" : "right"}
            title={title}
            firstSticker={firstSticker}
            // Stickers stamp in on first open only; turned pages arrive stuck.
            stamp={!turned}
          />
        </TurnSheet>
      ))}
    </Spread>
  )
}

/**
 * One page's place in the spread. While turning it rotates about its hinge
 * edge by the leaf angle plus its offset (180° for the leaf's back), and hides
 * whenever it faces away.
 */
function TurnSheet({
  angle,
  slot,
  turn,
  children,
}: {
  angle: MotionValue<number>
  slot: number
  turn: SheetTurn | null
  children: React.ReactNode
}) {
  const turnRef = useRef(turn)
  useLayoutEffect(() => {
    turnRef.current = turn
  })

  const rotate = useTransform(angle, (v) => {
    const t = turnRef.current
    return t ? v + t.offset : 0
  })
  // Darkens as it tilts away from the light toward edge-on.
  const shade = useTransform(
    rotate,
    (r) => (Math.min(Math.abs(r), 90) / 90) * 0.28
  )
  // No perspective, so the page keeps its height; a shadow that peaks
  // mid-turn stands in for the depth.
  const liftShadow = useTransform(rotate, (r) => {
    const l = Math.abs(Math.sin((r * Math.PI) / 180))
    return `0 ${(10 * l).toFixed(1)}px ${(36 * l).toFixed(1)}px rgba(60,40,10,${(0.28 * l).toFixed(3)})`
  })

  return (
    <motion.div
      inert={turn !== null}
      className={cn(
        "relative grid",
        turn && "z-10",
        SHEET_CELL[slot],
        SHEET_ROUND[slot]
      )}
      style={{
        rotateY: rotate,
        transformOrigin:
          turn?.hinge === "right" ? "right center" : "left center",
        boxShadow: liftShadow,
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      {children}
      <motion.div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-black",
          SHEET_ROUND[slot]
        )}
        style={{ opacity: shade }}
      />
    </motion.div>
  )
}

function Spread({
  children,
  overlay,
  turning = false,
}: {
  children: React.ReactNode
  /** Centered over the pages, e.g. an empty-state notice. */
  overlay?: React.ReactNode
  turning?: boolean
}) {
  return (
    <section
      className={cn("relative isolate", turning && "pointer-events-none")}
    >
      <div
        aria-hidden
        className="absolute inset-x-3 top-2 -bottom-2 -z-10 hidden rounded-[28px] bg-[#ece5d5] lg:block"
      />
      <div
        aria-hidden
        className="absolute inset-x-6 top-4 -bottom-4 -z-20 hidden rounded-[28px] bg-[#e3dac7] lg:block"
      />
      <div className="relative grid gap-6 lg:grid-cols-2 lg:gap-0 lg:rounded-[26px] lg:shadow-[0_30px_60px_-30px_rgba(60,40,10,0.35),0_0_0_1px_rgba(60,40,10,0.07)]">
        {children}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-[rgba(60,40,10,0.1)] lg:block"
      />
      {overlay ? (
        <div className="absolute inset-0 grid place-items-center p-4">
          {overlay}
        </div>
      ) : null}
    </section>
  )
}

function BookPage({
  page,
  side,
  title,
  firstSticker,
  stamp,
}: {
  page: Page
  side: Side
  title: string
  firstSticker: boolean
  stamp: boolean
}) {
  const numbers = page.slots.flatMap((slot) =>
    slot.no === undefined ? [] : [slot.no]
  )
  const range = numbers.length
    ? `${slotLabel(numbers[0])}–${String(numbers.at(-1)).padStart(2, "0")}`
    : null

  return (
    <div
      style={PAPER}
      className={cn(
        "relative flex flex-col rounded-[24px] px-4 pt-4 pb-5 shadow-[0_20px_40px_-28px_rgba(60,40,10,0.45),0_0_0_1px_rgba(60,40,10,0.07)] sm:px-7 sm:pt-6",
        // The spread has no clipping (a turning leaf must overhang it), so each
        // page rounds its own outer corners.
        "lg:shadow-none",
        side === "left"
          ? "lg:rounded-l-[26px] lg:rounded-r-none"
          : "lg:rounded-l-none lg:rounded-r-[26px]"
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 hidden w-16 from-[rgba(80,60,20,0.09)] to-transparent lg:block",
          side === "left"
            ? "right-0 bg-gradient-to-l"
            : "left-0 bg-gradient-to-r"
        )}
      />
      <header className="relative flex items-center justify-between font-mono text-[10px] tracking-[0.14em] text-[#a8946f] uppercase">
        <span>{title}</span>
        {range ? <span>{range}</span> : null}
      </header>

      <ul className="relative mt-4 grid flex-1 grid-cols-2 content-start gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5">
        {page.slots.map((slot, i) =>
          slot.kind === "sticker" ? (
            <StickerSlot
              key={slot.sticker.id}
              no={slot.no}
              sticker={slot.sticker}
              index={i}
              stamp={stamp}
            />
          ) : slot.kind === "next" ? (
            <NextSlot key="next" no={slot.no} first={firstSticker} />
          ) : (
            <EmptySlot key={`empty-${i}`} no={slot.no} />
          )
        )}
      </ul>

      <footer className="relative mt-5 text-center font-mono text-[11px] text-[#a8946f] tabular-nums">
        {page.number}
      </footer>
    </div>
  )
}

function SlotNumber({ no }: { no?: number }) {
  return (
    <span className="self-start pl-1 font-mono text-[10px] tracking-[0.06em] text-[#b3a07c] tabular-nums">
      {no === undefined ? "\u00a0" : slotLabel(no)}
    </span>
  )
}

function StickerSlot({
  no,
  sticker,
  index,
  stamp,
}: {
  no: number
  sticker: MySticker
  index: number
  stamp: boolean
}) {
  const navigate = useNavigate()
  const router = useRouter()
  const [boxRef, width] = useWidth<HTMLDivElement>()
  const art = Math.round(width * (1 - 2 * ART_INSET))
  const params = { id: sticker.id }
  const status = wallStatus(sticker.visibleShare)
  /** Covered plots replace the category so the book shows who needs help. */
  const coverage =
    sticker.archivedAt ||
    status.status === "visible" ||
    status.status === "none"
      ? null
      : status

  return (
    <li
      // Lift the hovered slot so a peeling flap draws over its neighbours.
      className="relative flex flex-col items-center text-center hover:z-10 active:z-10"
      onPointerEnter={() => {
        router
          .preloadRoute({ to: "/dashboard/stickers/$id", params })
          .catch(() => {})
      }}
    >
      <SlotNumber no={no} />
      <motion.div
        ref={boxRef}
        initial={stamp ? { opacity: 0, scale: 1.12 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          duration: 0.35,
          delay: Math.min(index * 0.04, 0.24),
          ease: [0.23, 1, 0.32, 1],
        }}
        className="relative aspect-square w-full"
      >
        <div
          style={{ rotate: `${tiltFor(sticker.id)}deg` }}
          className="absolute inset-0 grid place-items-center"
        >
          {art > 0 ? (
            <PeelToVisit
              src={sticker.imageUrl}
              name={sticker.name}
              url={sticker.url}
              holo={isHoloFinish(sticker.finish)}
              displayPx={art}
              hitPad={Math.floor(width * ART_INSET)}
              floating={false}
              appearOnMount={false}
              touchAction="pan-y"
              onTap={() => navigate({ to: "/dashboard/stickers/$id", params })}
            />
          ) : (
            <img
              src={sticker.imageUrl}
              alt=""
              className="absolute top-[7%] left-[7%] size-[86%] object-contain"
            />
          )}
        </div>
      </motion.div>
      <Link
        to="/dashboard/stickers/$id"
        params={params}
        className="mt-1 flex w-full flex-col items-center rounded-lg px-1 outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
      >
        <span className="line-clamp-1 w-full text-[14px] font-semibold tracking-[-0.02em] break-all text-neutral-900 sm:text-[15px]">
          {sticker.name}
        </span>
        {/* One line, like the blank slots, so every page keeps the same height. */}
        <span className="mt-0.5 flex max-w-full items-center gap-1.5 text-[12px] text-[#8c7a5b]">
          {coverage ? (
            <>
              <span
                aria-hidden
                className={cn("size-1.5 shrink-0 rounded-full", coverage.dot)}
              />
              <span className="truncate">{coverage.label}</span>
            </>
          ) : (
            <>
              {sticker.onWall > 0 && !sticker.archivedAt ? (
                <span
                  aria-label="On the wall"
                  className="size-1.5 shrink-0 rounded-full bg-[#34c759]"
                />
              ) : null}
              <span className="truncate">{sticker.category}</span>
            </>
          )}
        </span>
      </Link>
    </li>
  )
}

function Pager({
  label,
  canBack,
  canForward,
  onTurn,
}: {
  label: string
  canBack: boolean
  canForward: boolean
  onTurn: (delta: 1 | -1) => void
}) {
  const button =
    "press grid size-11 place-items-center rounded-full bg-white text-neutral-800 shadow-[0_1px_3px_rgba(0,0,0,0.1),0_0_0_1px_rgba(60,40,10,0.08)] transition-[opacity,background-color] duration-200 hover:bg-[#fbf8f1] disabled:pointer-events-none disabled:opacity-35"

  return (
    <nav
      aria-label="Sticker book pages"
      className="mt-8 flex items-center justify-center gap-5"
    >
      <button
        type="button"
        aria-label="Previous pages"
        disabled={!canBack}
        onClick={() => onTurn(-1)}
        className={button}
      >
        <CaretLeft weight="bold" className="size-4" />
      </button>
      <p
        aria-live="polite"
        className="min-w-36 text-center font-mono text-[12px] tracking-[0.04em] text-[#8c7a5b] tabular-nums"
      >
        {label}
      </p>
      <button
        type="button"
        aria-label="Next pages"
        disabled={!canForward}
        onClick={() => onTurn(1)}
        className={button}
      >
        <CaretRight weight="bold" className="size-4" />
      </button>
    </nav>
  )
}

function NextSlot({ no, first }: { no: number; first: boolean }) {
  return (
    <li>
      <Link
        to="/make"
        className="group flex flex-col items-center rounded-[18px] text-center outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
      >
        <SlotNumber no={no} />
        <div className="aspect-square w-full p-2 sm:p-3">
          <div className="grid size-full place-items-center rounded-[22px] border-[1.5px] border-dashed border-[#cdbf9f] text-[#a8946f] transition-colors duration-200 group-hover:border-neutral-900 group-hover:bg-white/70 group-hover:text-neutral-900">
            <Plus weight="bold" className="size-6" />
          </div>
        </div>
        <p className="mt-1 text-[14px] font-semibold tracking-[-0.02em] text-neutral-900 sm:text-[15px]">
          {first ? "Make your first" : "Make a sticker"}
        </p>
        <p className="mt-0.5 text-[12px] text-[#8c7a5b]">Next slot</p>
      </Link>
    </li>
  )
}

function EmptySlot({ no }: { no?: number }) {
  return (
    <li aria-hidden className="flex flex-col items-center">
      <SlotNumber no={no} />
      <div className="aspect-square w-full p-2 sm:p-3">
        <div className="size-full rounded-[22px] border-[1.5px] border-dashed border-[#e6dcc7]" />
      </div>
      {/* Same caption height as a filled slot, so every row lines up. */}
      <div className="invisible mt-1 flex flex-col">
        <span className="text-[14px] font-semibold sm:text-[15px]">&nbsp;</span>
        <span className="mt-0.5 text-[12px]">&nbsp;</span>
      </div>
    </li>
  )
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (value: T) => void
  options: { value: T; label: string; count: number }[]
}) {
  return (
    <div role="tablist" className="inline-flex rounded-full bg-[#f2f2f7] p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative h-8 rounded-full px-4 text-[13px] font-semibold tracking-[-0.01em] transition-colors duration-200",
              active
                ? "text-neutral-900"
                : "text-neutral-500 hover:text-neutral-800"
            )}
          >
            {active ? (
              <motion.span
                layoutId="dashboard-segment"
                transition={{ type: "spring", duration: 0.35, bounce: 0.15 }}
                className="absolute inset-0 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_0_0_0.5px_rgba(0,0,0,0.04)]"
              />
            ) : null}
            <span className="relative">
              {option.label}
              <span className="ml-1 text-neutral-400 tabular-nums">
                {option.count}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
