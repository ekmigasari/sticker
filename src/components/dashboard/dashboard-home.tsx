import { useRef, useState } from "react"
import { Link } from "@tanstack/react-router"
import { PencilSimple, Plus } from "@phosphor-icons/react"
import { motion } from "motion/react"
import { ProfileAvatar } from "@/components/profile-avatar"
import type { MySticker } from "@/lib/stickers"
import { cn } from "@/lib/utils"
import { ProfileSheet, type Profile } from "./profile-sheet"

type Tab = "book" | "archived"

const PER_PAGE = 6

type Slot =
  | { kind: "sticker"; no: number; sticker: MySticker }
  | { kind: "next"; no: number }
  | { kind: "empty"; no: number }

type Page = { slots: Slot[]; number: number; spreadOnly: boolean }

/** Oldest first so slot numbers stay put as the book grows. */
function buildPages(stickers: MySticker[], withNext: boolean): Page[] {
  const slots: Slot[] = stickers.map((sticker, i) => ({
    kind: "sticker",
    no: i + 1,
    sticker,
  }))
  if (withNext) {
    slots.push({ kind: "next", no: slots.length + 1 })
    while (slots.length % PER_PAGE) {
      slots.push({ kind: "empty", no: slots.length + 1 })
    }
  }
  const pages: Page[] = []
  for (let i = 0; i < Math.max(slots.length, 1); i += PER_PAGE) {
    pages.push({
      slots: slots.slice(i, i + PER_PAGE),
      number: pages.length + 1,
      spreadOnly: false,
    })
  }
  // Wide screens show two-page spreads; pad the last one.
  if (pages.length % 2) {
    const start = slots.length
    pages.push({
      slots: withNext
        ? Array.from({ length: PER_PAGE }, (_, i) => ({
            kind: "empty" as const,
            no: start + i + 1,
          }))
        : [],
      number: pages.length + 1,
      spreadOnly: true,
    })
  }
  return pages
}

function tiltFor(id: string) {
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0
  return ((Math.abs(hash) % 9) - 4) * 1.1
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

export function DashboardHome({
  user,
  stickers,
}: {
  user: Profile
  stickers: MySticker[]
}) {
  const [tab, setTab] = useState<Tab>("book")
  const [editingProfile, setEditingProfile] = useState(false)

  const ordered = [...stickers].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt)
  )
  const live = ordered.filter((s) => !s.archivedAt)
  const archived = ordered.filter((s) => s.archivedAt)
  const activeTab: Tab = tab === "archived" && archived.length ? tab : "book"
  const pages =
    activeTab === "archived"
      ? buildPages(archived, false)
      : buildPages(live, true)
  const spreads: Page[][] = []
  for (let i = 0; i < pages.length; i += 2) spreads.push(pages.slice(i, i + 2))

  const spots = stickers.reduce((sum, s) => sum + s.onWall, 0)
  const spent = stickers.reduce((sum, s) => sum + s.totalSpent, 0)

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-8 sm:pt-10">
      <BookCover
        user={user}
        stats={`${live.length} collected · ${spots} on the wall · $${spent.toLocaleString("en-US")} spent`}
        onEditProfile={() => setEditingProfile(true)}
      />

      {archived.length ? (
        <div className="mt-8 flex justify-center sm:justify-start">
          <Segmented
            value={activeTab}
            onChange={setTab}
            options={[
              { value: "book", label: "Book", count: live.length },
              { value: "archived", label: "Archived", count: archived.length },
            ]}
          />
        </div>
      ) : null}

      <div key={activeTab} className="mt-8 flex flex-col gap-10 sm:mt-10">
        {spreads.map((spread, i) => (
          <Spread
            key={i}
            pages={spread}
            title={activeTab === "archived" ? "Archived" : "Sticker Book"}
            firstSticker={live.length === 0}
          />
        ))}
      </div>

      <ProfileSheet
        open={editingProfile}
        onOpenChange={setEditingProfile}
        profile={user}
      />
    </div>
  )
}

function BookCover({
  user,
  stats,
  onEditProfile,
}: {
  user: Profile
  stats: string
  onEditProfile: () => void
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
        <p className="mt-2 text-[15px] tracking-[-0.01em] text-neutral-500 tabular-nums">
          {stats}
        </p>
      </div>

      <div className="flex shrink-0 gap-2 sm:col-start-2 lg:col-start-3">
        <button
          type="button"
          onClick={onEditProfile}
          className="nk-btn-secondary"
        >
          Edit profile
        </button>
        <Link to="/make" className="nk-btn">
          <Plus weight="bold" className="size-4" />
          Make a sticker
        </Link>
      </div>
    </header>
  )
}

function Spread({
  pages,
  title,
  firstSticker,
}: {
  pages: Page[]
  title: string
  firstSticker: boolean
}) {
  return (
    <section className="relative isolate">
      <div
        aria-hidden
        className="absolute inset-x-3 top-2 -bottom-2 -z-10 hidden rounded-[28px] bg-[#ece5d5] lg:block"
      />
      <div
        aria-hidden
        className="absolute inset-x-6 top-4 -bottom-4 -z-20 hidden rounded-[28px] bg-[#e3dac7] lg:block"
      />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-0 lg:overflow-hidden lg:rounded-[26px] lg:shadow-[0_30px_60px_-30px_rgba(60,40,10,0.35),0_0_0_1px_rgba(60,40,10,0.07)]">
        {pages.map((page, i) => (
          <BookPage
            key={page.number}
            page={page}
            side={i === 0 ? "left" : "right"}
            title={title}
            firstSticker={firstSticker}
          />
        ))}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-[rgba(60,40,10,0.1)] lg:block"
      />
    </section>
  )
}

function BookPage({
  page,
  side,
  title,
  firstSticker,
}: {
  page: Page
  side: "left" | "right"
  title: string
  firstSticker: boolean
}) {
  const first = page.slots[0]
  const last = page.slots.at(-1)
  const range =
    first && last
      ? `${slotLabel(first.no)}–${String(last.no).padStart(2, "0")}`
      : null

  return (
    <div
      style={PAPER}
      className={cn(
        "relative flex flex-col rounded-[24px] px-4 pt-4 pb-5 shadow-[0_20px_40px_-28px_rgba(60,40,10,0.45),0_0_0_1px_rgba(60,40,10,0.07)] sm:px-7 sm:pt-6",
        "lg:rounded-none lg:shadow-none",
        page.spreadOnly && "hidden lg:flex"
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

      {page.slots.length ? (
        <ul className="relative mt-4 grid flex-1 grid-cols-2 content-start gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-5">
          {page.slots.map((slot, i) =>
            slot.kind === "sticker" ? (
              <StickerSlot
                key={slot.sticker.id}
                no={slot.no}
                sticker={slot.sticker}
                index={i}
              />
            ) : slot.kind === "next" ? (
              <NextSlot key="next" no={slot.no} first={firstSticker} />
            ) : (
              <EmptySlot key={slot.no} no={slot.no} />
            )
          )}
        </ul>
      ) : (
        <div className="flex-1" />
      )}

      <footer className="relative mt-5 text-center font-mono text-[11px] text-[#a8946f] tabular-nums">
        {page.number}
      </footer>
    </div>
  )
}

function SlotNumber({ no }: { no: number }) {
  return (
    <span className="self-start pl-1 font-mono text-[10px] tracking-[0.06em] text-[#b3a07c] tabular-nums">
      {slotLabel(no)}
    </span>
  )
}

function StickerSlot({
  no,
  sticker,
  index,
}: {
  no: number
  sticker: MySticker
  index: number
}) {
  const boxRef = useRef<HTMLDivElement>(null)

  function track(event: React.PointerEvent<HTMLAnchorElement>) {
    if (event.pointerType === "touch") return
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return
    const axis = (offset: number, size: number) =>
      Math.max(-1, Math.min(1, (offset / size) * 2 - 1)).toFixed(3)
    const { style } = event.currentTarget
    style.setProperty("--px", axis(event.clientX - box.left, box.width))
    style.setProperty("--py", axis(event.clientY - box.top, box.height))
    style.setProperty("--lift", "1")
  }

  function release(event: React.PointerEvent<HTMLAnchorElement>) {
    const { style } = event.currentTarget
    style.setProperty("--px", "0")
    style.setProperty("--py", "0")
    style.setProperty("--lift", "0")
  }

  return (
    <li>
      <Link
        to="/dashboard/stickers/$id"
        params={{ id: sticker.id }}
        onPointerMove={track}
        onPointerLeave={release}
        className="group flex flex-col items-center rounded-[18px] text-center outline-none focus-visible:ring-2 focus-visible:ring-[#0071e3]"
      >
        <SlotNumber no={no} />
        <motion.div
          ref={boxRef}
          initial={{ opacity: 0, scale: 1.12 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.35,
            delay: Math.min(index * 0.04, 0.24),
            ease: [0.23, 1, 0.32, 1],
          }}
          className="relative aspect-square w-full"
        >
          <div
            style={
              { "--tilt": `${tiltFor(sticker.id)}deg` } as React.CSSProperties
            }
            className="sticker-peel absolute inset-0 p-2 sm:p-3"
          >
            <img
              src={sticker.imageUrl}
              alt=""
              loading="lazy"
              className="size-full object-contain"
            />
            <span
              aria-hidden
              style={
                {
                  "--sticker-mask": `url("${sticker.imageUrl}")`,
                } as React.CSSProperties
              }
              className="sticker-sheen absolute inset-2 sm:inset-3"
            />
          </div>
        </motion.div>
        <p className="mt-1 line-clamp-1 w-full px-1 text-[14px] font-semibold tracking-[-0.02em] break-all text-neutral-900 sm:text-[15px]">
          {sticker.name}
        </p>
        <p className="mt-0.5 inline-flex items-center gap-1.5 text-[12px] text-[#8c7a5b]">
          {sticker.onWall > 0 && !sticker.archivedAt ? (
            <span
              aria-label="On the wall"
              className="size-1.5 rounded-full bg-[#34c759]"
            />
          ) : null}
          {sticker.category}
        </p>
      </Link>
    </li>
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

function EmptySlot({ no }: { no: number }) {
  return (
    <li aria-hidden className="flex flex-col items-center">
      <SlotNumber no={no} />
      <div className="aspect-square w-full p-2 sm:p-3">
        <div className="size-full rounded-[22px] border-[1.5px] border-dashed border-[#e6dcc7]" />
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
