import { useState } from "react"
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  CaretLeft,
  Prohibit,
  ShieldCheck,
  ShieldSlash,
  SignOut,
  Trash,
  UserCheck,
} from "@phosphor-icons/react"
import { ModeratedStickerList, UserBadges } from "@/components/admin/admin-rows"
import {
  BanSheet,
  ConfirmSheet,
  Section,
  formatDate,
  formatDollars,
  type ConfirmRequest,
} from "@/components/admin/admin-ui"
import { ProfileAvatar } from "@/components/profile-avatar"
import {
  banUser,
  deleteUser,
  getAdminUser,
  revokeUserSessions,
  setUserAdmin,
  unbanUser,
  type AdminUserDetail,
} from "@/lib/admin"
import { cn } from "@/lib/utils"

export const Route = createFileRoute("/_protected/admin/users/$id")({
  loader: ({ params }) => getAdminUser({ data: params.id }),
  component: AdminUserPage,
})

function AdminUserPage() {
  const user = Route.useLoaderData()
  const { user: me } = Route.useRouteContext()

  return (
    <div className="flex flex-col gap-8">
      <Link
        to="/admin/users"
        className="press -ml-2 inline-flex h-9 w-fit items-center gap-1 rounded-full pr-3 pl-2 text-[15px] font-semibold tracking-[-0.01em] text-[#0071e3] transition-colors hover:bg-[#0071e3]/[0.06]"
      >
        <CaretLeft weight="bold" className="size-4" />
        Users
      </Link>
      {user ? (
        <UserDetail user={user} isSelf={user.id === me.id} />
      ) : (
        <p className="py-16 text-center text-[15px] text-neutral-500">
          This user doesn't exist anymore.
        </p>
      )}
    </div>
  )
}

function UserDetail({
  user,
  isSelf,
}: {
  user: AdminUserDetail
  isSelf: boolean
}) {
  const navigate = useNavigate()
  const [banning, setBanning] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null)
  const name = user.name || user.email

  const actions: ActionProps[] = [
    user.banned
      ? {
          icon: UserCheck,
          label: "Unban",
          hint: "Let them sign in again and bring their stickers back.",
          onClick: () =>
            setConfirm({
              title: "Unban User",
              body: `${name} can sign in again, and their stickers return to the wall and directory.`,
              confirmLabel: "Unban",
              pendingLabel: "Unbanning…",
              onConfirm: () => unbanUser({ data: { id: user.id } }),
            }),
        }
      : {
          icon: Prohibit,
          label: "Ban",
          hint: user.isAdmin
            ? "Remove their admin role first."
            : "Block sign-in and hide all their stickers.",
          danger: true,
          disabled: isSelf || user.isAdmin,
          onClick: () => setBanning(true),
        },
    user.isAdmin
      ? {
          icon: ShieldSlash,
          label: "Remove admin",
          hint: isSelf
            ? "You can't remove your own admin role."
            : "They lose access to this panel.",
          disabled: isSelf,
          onClick: () =>
            setConfirm({
              title: "Remove Admin",
              body: `${name} loses access to the admin panel.`,
              confirmLabel: "Remove admin",
              pendingLabel: "Removing…",
              destructive: true,
              onConfirm: () =>
                setUserAdmin({ data: { id: user.id, admin: false } }),
            }),
        }
      : {
          icon: ShieldCheck,
          label: "Make admin",
          hint: user.banned
            ? "Unban them first."
            : "Full access to users and stickers.",
          disabled: user.banned,
          onClick: () =>
            setConfirm({
              title: "Make Admin",
              body: `${name} gets full access to this panel: they can ban users and take down or delete any sticker.`,
              confirmLabel: "Make admin",
              pendingLabel: "Saving…",
              onConfirm: () =>
                setUserAdmin({ data: { id: user.id, admin: true } }),
            }),
        },
    {
      icon: SignOut,
      label: "Sign out everywhere",
      hint: `${user.sessions.length} active ${user.sessions.length === 1 ? "session" : "sessions"}.`,
      disabled: !user.sessions.length,
      onClick: () =>
        setConfirm({
          title: "Sign Out Everywhere",
          body: isSelf
            ? "This signs you out too, on every device."
            : `${name} is signed out on every device. They can sign back in.`,
          confirmLabel: "Sign out",
          pendingLabel: "Signing out…",
          onConfirm: () => revokeUserSessions({ data: { id: user.id } }),
        }),
    },
    {
      icon: Trash,
      label: "Delete account",
      hint: isSelf
        ? "You can't delete yourself."
        : user.isAdmin
          ? "Remove their admin role first."
          : "Deletes the user and all their stickers.",
      danger: true,
      disabled: isSelf || user.isAdmin,
      onClick: () =>
        setConfirm({
          title: "Delete Account",
          body: `${name}, their ${user.stickerCount === 1 ? "sticker" : `${user.stickerCount} stickers`} and every wall spot they own are deleted for good. This can't be undone.`,
          confirmLabel: "Delete account",
          pendingLabel: "Deleting…",
          destructive: true,
          onConfirm: async () => {
            await deleteUser({ data: { id: user.id } })
            await navigate({ to: "/admin/users" })
          },
        }),
    },
  ]

  return (
    <>
      <header className="flex items-center gap-4">
        <ProfileAvatar
          name={user.name}
          email={user.email}
          image={user.image}
          className={cn("size-16 text-[20px]", user.banned && "grayscale")}
        />
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-[24px] font-semibold tracking-[-0.03em] text-neutral-900">
              {user.name || "Unnamed"}
            </h2>
            <UserBadges user={user} />
            {isSelf ? (
              <span className="text-[13px] text-neutral-400">You</span>
            ) : null}
          </div>
          <p className="truncate text-[15px] text-neutral-500">{user.email}</p>
        </div>
      </header>

      {user.banned ? (
        <div className="rounded-[18px] bg-[#ff3b30]/[0.07] px-4 py-3">
          <p className="text-[15px] font-semibold tracking-[-0.01em] text-[#d70015]">
            Banned{" "}
            {user.banExpires
              ? `until ${formatDate(user.banExpires)}`
              : "permanently"}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-neutral-600">
            {user.banReason || "No reason given."}
          </p>
        </div>
      ) : null}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-[20px] bg-[#f5f5f7] p-4 sm:grid-cols-4">
        <Fact label="Joined" value={formatDate(user.createdAt)} />
        <Fact
          label="Email"
          value={user.emailVerified ? "Verified" : "Unverified"}
        />
        <Fact label="Stickers" value={String(user.stickerCount)} />
        <Fact label="Spent" value={formatDollars(user.totalSpent)} />
        <Fact
          label="Sign-in"
          value={
            user.providers.join(", ").replace("credential", "Password") || "—"
          }
        />
        <Fact label="Sessions" value={String(user.sessions.length)} />
        <Fact label="User ID" value={user.id} mono />
      </dl>

      <Section title="Controls">
        <div className="grid gap-2 sm:grid-cols-2">
          {actions.map((a) => (
            <ActionButton key={a.label} {...a} />
          ))}
        </div>
      </Section>

      <Section title={`Stickers (${user.stickers.length})`}>
        {user.stickers.length ? (
          <ModeratedStickerList stickers={user.stickers} showOwner={false} />
        ) : (
          <p className="text-[15px] text-neutral-500">No stickers.</p>
        )}
      </Section>

      <Section title="Active sessions">
        {user.sessions.length ? (
          <ul>
            {user.sessions.map((s) => (
              <li
                key={s.id}
                className="border-b border-black/[0.06] py-3 last:border-b-0"
              >
                <p className="truncate text-[14px] font-medium tracking-[-0.01em] text-neutral-900">
                  {s.userAgent || "Unknown device"}
                </p>
                <p className="text-[13px] text-neutral-500 tabular-nums">
                  {s.ipAddress || "Unknown IP"} · signed in{" "}
                  {formatDate(s.createdAt)} · expires {formatDate(s.expiresAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[15px] text-neutral-500">
            Not signed in anywhere.
          </p>
        )}
      </Section>

      <BanSheet
        user={banning ? user : null}
        onBan={({ reason, days }) =>
          banUser({ data: { id: user.id, reason, days } })
        }
        onClose={() => setBanning(false)}
      />
      <ConfirmSheet request={confirm} onClose={() => setConfirm(null)} />
    </>
  )
}

function Fact({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium text-neutral-500">{label}</dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-[15px] font-semibold tracking-[-0.01em] text-neutral-900",
          mono && "font-mono text-[12px] font-normal select-all"
        )}
        title={value}
      >
        {value}
      </dd>
    </div>
  )
}

type ActionProps = {
  icon: React.ComponentType<{ weight?: "bold"; className?: string }>
  label: string
  hint: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}

function ActionButton({
  icon: Icon,
  label,
  hint,
  danger,
  disabled,
  onClick,
}: ActionProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="press flex items-center gap-3 rounded-[18px] bg-[#f5f5f7] px-4 py-3 text-left transition-colors hover:bg-[#ededf0] disabled:pointer-events-none disabled:opacity-45"
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]",
          danger ? "text-[#ff3b30]" : "text-neutral-800"
        )}
      >
        <Icon weight="bold" className="size-4" />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "block text-[15px] font-semibold tracking-[-0.01em]",
            danger ? "text-[#ff3b30]" : "text-neutral-900"
          )}
        >
          {label}
        </span>
        <span className="block text-[13px] leading-snug text-neutral-500">
          {hint}
        </span>
      </span>
    </button>
  )
}
