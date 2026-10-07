import {
  Link,
  useNavigate,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router"
import {
  House,
  MagicWand,
  SignOut,
  SquaresFour,
  Sticker,
} from "@phosphor-icons/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const publicLinks = [
  { to: "/", label: "Wall", icon: SquaresFour },
  { to: "/make", label: "Make", icon: MagicWand },
  { to: "/stickers", label: "Stickers", icon: Sticker },
] as const

/** Apple-style glass capsule shared by the nav and account controls. */
export const glassCapsule =
  "border border-white/70 bg-white/75 shadow-[0_6px_24px_-10px_rgba(0,0,0,0.25),0_0_0_0.5px_rgba(0,0,0,0.08)] backdrop-blur-2xl backdrop-saturate-[1.8]"

export function SiteNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Main"
      className={cn(
        "flex items-center gap-0.5 rounded-full p-1 font-ui",
        glassCapsule,
        className
      )}
    >
      {publicLinks.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          activeOptions={{ exact: to === "/" }}
          className="press flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium tracking-[-0.01em] text-neutral-500 transition-colors hover:text-neutral-900 max-[399px]:gap-1 max-[399px]:px-2.5 sm:px-3.5 [&.active]:bg-black/[0.07] [&.active]:font-semibold [&.active]:text-neutral-900"
        >
          <Icon weight="bold" className="size-3.5 max-[359px]:hidden" />
          {label}
        </Link>
      ))}
    </nav>
  )
}

function initials(name: string | undefined, email: string | undefined) {
  const source = (name?.trim() || email?.split("@")[0] || "?").trim()
  const parts = source.split(/\s+/).filter(Boolean)
  const letters =
    parts.length > 1 ? parts[0]![0]! + parts[1]![0]! : source.slice(0, 2)
  return letters.toUpperCase()
}

/** Log in CTA when signed out; avatar with Dashboard / Log out when signed in. */
export function AccountButton({ className }: { className?: string }) {
  const { session } = useRouteContext({ from: "__root__" })
  const router = useRouter()
  const navigate = useNavigate()

  if (!session) {
    return (
      <Link
        to="/sign-in"
        className={cn(
          "press inline-flex h-10 items-center rounded-full bg-neutral-900 px-4 font-ui text-[14px] font-semibold tracking-[-0.01em] whitespace-nowrap text-white shadow-[0_6px_20px_-8px_rgba(0,0,0,0.45)] transition-opacity hover:opacity-90 max-[399px]:px-3.5 sm:px-5",
          className
        )}
      >
        Log in
      </Link>
    )
  }

  const { name, email } = session.user

  async function logOut() {
    await authClient.signOut()
    await router.invalidate()
    await navigate({ to: "/" })
  }

  const item =
    "flex h-9 cursor-default items-center gap-2.5 rounded-[9px] px-2.5 text-[14px] font-normal tracking-[-0.01em] normal-case text-neutral-900 outline-none data-highlighted:bg-black/[0.06] focus:bg-black/[0.06] [&_svg]:size-4"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className={cn(
          "press grid place-items-center rounded-full font-ui outline-none focus-visible:ring-2 focus-visible:ring-neutral-400",
          "size-10 p-0.5",
          glassCapsule,
          className
        )}
      >
        <span className="grid size-full place-items-center rounded-full bg-gradient-to-b from-neutral-400 to-neutral-600 text-[13px] font-semibold tracking-[-0.01em] text-white">
          {initials(name, email)}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-60 rounded-[14px] border border-white/70 bg-white/85 p-1.5 font-ui shadow-[0_16px_48px_-12px_rgba(0,0,0,0.3),0_0_0_0.5px_rgba(0,0,0,0.08)] ring-0 backdrop-blur-2xl backdrop-saturate-[1.8]"
      >
        <div className="px-2.5 pt-1.5 pb-2">
          <p className="truncate text-[14px] font-semibold tracking-[-0.01em] text-neutral-900">
            {name || "Account"}
          </p>
          {email ? (
            <p className="truncate text-[12px] text-neutral-500">{email}</p>
          ) : null}
        </div>
        <DropdownMenuSeparator className="mx-1 my-1 bg-black/[0.08]" />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className={item}
            onClick={() => void navigate({ to: "/dashboard" })}
          >
            <House weight="regular" />
            Dashboard
          </DropdownMenuItem>
          <DropdownMenuItem
            className={cn(item, "text-red-600")}
            onClick={() => void logOut()}
          >
            <SignOut weight="regular" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function BrandMark({
  className,
  compact,
}: {
  className?: string
  compact?: boolean
}) {
  return (
    <Link
      to="/"
      className={cn(
        "group flex items-center gap-2.5 font-ui text-neutral-900",
        className
      )}
    >
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-[10px] bg-neutral-900 text-[13px] font-semibold tracking-[-0.02em] text-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
      >
        N
      </span>
      {!compact ? (
        <span className="text-[17px] font-semibold tracking-[-0.02em]">
          Netkraft
        </span>
      ) : null}
    </Link>
  )
}
