import { useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  ArrowSquareOut,
  ArrowUUpLeft,
  DotsThree,
  EyeSlash,
  Sticker as StickerIcon,
  Trash,
} from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ProfileAvatar } from "@/components/profile-avatar"
import {
  Badge,
  ConfirmSheet,
  formatDate,
  formatDollars,
  type ConfirmRequest,
} from "@/components/admin/admin-ui"
import {
  deleteSticker,
  hideSticker,
  unhideSticker,
  type AdminUserRow,
} from "@/lib/admin"
import { cn } from "@/lib/utils"

export type ModeratedSticker = {
  id: string
  slug: string
  name: string
  url: string
  category: string
  imageUrl: string
  totalSpent: number
  onWall: number
  archivedAt?: string | null
  hiddenAt?: string | null
  hiddenReason?: string | null
  createdAt: string
  owner?: { id: string; name: string; email: string; banned: boolean }
}

const menuItem =
  "flex h-9 cursor-default items-center gap-2.5 rounded-[9px] px-2.5 text-[14px] font-normal tracking-[-0.01em] normal-case text-neutral-900 outline-none data-highlighted:bg-black/[0.06] focus:bg-black/[0.06] [&_svg]:size-4"

const menuPanel =
  "w-56 rounded-[14px] border border-white/70 bg-white/90 p-1.5 font-ui shadow-[0_16px_48px_-12px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(0,0,0,0.08)] ring-0 backdrop-blur-2xl backdrop-saturate-[1.8]"

export function StickerStatusBadges({
  sticker,
}: {
  sticker: Pick<ModeratedSticker, "hiddenAt" | "archivedAt" | "owner">
}) {
  return (
    <>
      {sticker.hiddenAt ? <Badge tone="red">Taken down</Badge> : null}
      {sticker.archivedAt ? <Badge>Archived</Badge> : null}
      {sticker.owner?.banned ? <Badge tone="amber">Owner banned</Badge> : null}
    </>
  )
}

/** Sticker rows with take-down, restore and delete actions. */
export function ModeratedStickerList({
  stickers,
  showOwner = true,
}: {
  stickers: ModeratedSticker[]
  showOwner?: boolean
}) {
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)

  function takeDown(s: ModeratedSticker) {
    setConfirm({
      title: "Take Down Sticker",
      body: (
        <>
          <span className="font-semibold text-neutral-900">{s.name}</span>{" "}
          leaves the wall, directory and rankings. The owner keeps it in their
          sticker book and can't put it back.
        </>
      ),
      confirmLabel: "Take down",
      pendingLabel: "Taking down…",
      destructive: true,
      reasonLabel: "Reason (shown to the owner)",
      onConfirm: (reason) => hideSticker({ data: { id: s.id, reason } }),
    })
  }

  function restore(s: ModeratedSticker) {
    setConfirm({
      title: "Restore Sticker",
      body: (
        <>
          <span className="font-semibold text-neutral-900">{s.name}</span> goes
          back on the wall and, unless archived, into the directory.
        </>
      ),
      confirmLabel: "Restore",
      pendingLabel: "Restoring…",
      onConfirm: () => unhideSticker({ data: { id: s.id } }),
    })
  }

  function remove(s: ModeratedSticker) {
    setConfirm({
      title: "Delete Sticker",
      body: (
        <>
          <span className="font-semibold text-neutral-900">{s.name}</span> and
          its {s.onWall === 1 ? "wall spot" : `${s.onWall} wall spots`} are
          deleted for good. Stickers underneath show again. This can't be
          undone.
        </>
      ),
      confirmLabel: "Delete",
      pendingLabel: "Deleting…",
      destructive: true,
      onConfirm: () => deleteSticker({ data: { id: s.id } }),
    })
  }

  return (
    <>
      <ul>
        {stickers.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-3 border-b border-black/[0.06] py-3 last:border-b-0"
          >
            <img
              src={s.imageUrl}
              alt=""
              loading="lazy"
              className={cn(
                "size-12 shrink-0 object-contain drop-shadow-[0_3px_6px_rgba(0,0,0,0.14)]",
                s.hiddenAt && "opacity-40 grayscale"
              )}
            />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-neutral-900">
                  {s.name}
                </p>
                <StickerStatusBadges sticker={s} />
              </div>
              <p className="mt-0.5 truncate text-[13px] text-neutral-500 tabular-nums">
                {showOwner && s.owner ? (
                  <>
                    <Link
                      to="/admin/users/$id"
                      params={{ id: s.owner.id }}
                      className="font-medium text-neutral-700 hover:text-[#0071e3] hover:underline"
                    >
                      {s.owner.email}
                    </Link>
                    {" · "}
                  </>
                ) : null}
                {s.category} · {s.onWall} on wall ·{" "}
                {formatDollars(s.totalSpent)} · {formatDate(s.createdAt)}
              </p>
              {s.hiddenAt && s.hiddenReason ? (
                <p className="mt-0.5 truncate text-[13px] text-[#d70015]">
                  {s.hiddenReason}
                </p>
              ) : null}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Actions for ${s.name}`}
                className="press grid size-9 shrink-0 place-items-center rounded-full text-neutral-500 transition-colors outline-none hover:bg-black/[0.06] hover:text-neutral-900 focus-visible:ring-2 focus-visible:ring-neutral-400"
              >
                <DotsThree weight="bold" className="size-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={6}
                className={menuPanel}
              >
                {!s.hiddenAt && !s.owner?.banned ? (
                  <DropdownMenuItem
                    className={menuItem}
                    render={
                      <Link to="/stickers/$slug" params={{ slug: s.slug }} />
                    }
                  >
                    <StickerIcon weight="regular" />
                    View sticker page
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className={menuItem}
                  render={<a href={s.url} target="_blank" rel="noreferrer" />}
                >
                  <ArrowSquareOut weight="regular" />
                  Open website
                </DropdownMenuItem>
                <DropdownMenuSeparator className="mx-1 my-1 bg-black/[0.08]" />
                {s.hiddenAt ? (
                  <DropdownMenuItem
                    className={menuItem}
                    onClick={() => restore(s)}
                  >
                    <ArrowUUpLeft weight="regular" />
                    Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className={menuItem}
                    onClick={() => takeDown(s)}
                  >
                    <EyeSlash weight="regular" />
                    Take down
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  className={cn(menuItem, "text-[#ff3b30]")}
                  onClick={() => remove(s)}
                >
                  <Trash weight="regular" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
      <ConfirmSheet request={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}

export function UserBadges({
  user,
}: {
  user: Pick<AdminUserRow, "isAdmin" | "banned">
}) {
  return (
    <>
      {user.isAdmin ? <Badge tone="blue">Admin</Badge> : null}
      {user.banned ? <Badge tone="red">Banned</Badge> : null}
    </>
  )
}

export function UserList({ users }: { users: AdminUserRow[] }) {
  return (
    <ul>
      {users.map((u) => (
        <li key={u.id} className="border-b border-black/[0.06] last:border-b-0">
          <Link
            to="/admin/users/$id"
            params={{ id: u.id }}
            className="-mx-2 flex items-center gap-3 rounded-[14px] px-2 py-3 transition-colors outline-none hover:bg-black/[0.03] focus-visible:ring-2 focus-visible:ring-[#0071e3]"
          >
            <ProfileAvatar
              name={u.name}
              email={u.email}
              image={u.image}
              className={cn("size-10 text-[13px]", u.banned && "grayscale")}
            />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-neutral-900">
                  {u.name || "Unnamed"}
                </p>
                <UserBadges user={u} />
              </div>
              <p className="truncate text-[13px] text-neutral-500">{u.email}</p>
            </div>
            <div className="hidden shrink-0 text-right sm:block">
              <p className="text-[14px] font-semibold tracking-[-0.01em] text-neutral-900 tabular-nums">
                {u.stickerCount} {u.stickerCount === 1 ? "sticker" : "stickers"}
                {u.totalSpent > 0 ? ` · ${formatDollars(u.totalSpent)}` : ""}
              </p>
              <p className="text-[12px] text-neutral-500">
                Joined {formatDate(u.createdAt)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  )
}
