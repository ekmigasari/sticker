import { Link, useRouteContext } from "@tanstack/react-router"
import {
  SquaresFour,
  MagicWand,
  ListMagnifyingGlass,
  House,
  SignIn,
} from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

const publicLinks = [
  { to: "/", label: "Wall", icon: SquaresFour },
  { to: "/make", label: "Make", icon: MagicWand },
  { to: "/directory", label: "Directory", icon: ListMagnifyingGlass },
] as const

export function SiteNav({ className }: { className?: string }) {
  const { session } = useRouteContext({ from: "__root__" })

  return (
    <nav
      className={cn(
        "font-ui flex items-center gap-0.5 rounded-full border border-black/[0.06] bg-white/80 px-1 py-1 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.12)] backdrop-blur-xl backdrop-saturate-150",
        className
      )}
    >
      {publicLinks.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] text-neutral-500 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 [&.active]:bg-neutral-900 [&.active]:text-white"
          activeOptions={{ exact: to === "/" }}
        >
          <Icon weight="bold" className="size-3.5" />
          {label}
        </Link>
      ))}
      {session ? (
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] text-neutral-500 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 [&.active]:bg-neutral-900 [&.active]:text-white"
        >
          <House weight="bold" className="size-3.5" />
          Dashboard
        </Link>
      ) : (
        <Link
          to="/sign-in"
          className="flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] text-neutral-500 transition-colors hover:bg-black/[0.04] hover:text-neutral-900 [&.active]:bg-neutral-900 [&.active]:text-white"
        >
          <SignIn weight="bold" className="size-3.5" />
          Sign in
        </Link>
      )}
    </nav>
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
        "font-ui group flex items-center gap-2.5 text-neutral-900",
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
