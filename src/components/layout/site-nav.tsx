import { Link } from "@tanstack/react-router"
import { SquaresFour, MagicWand, ListMagnifyingGlass } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

const links = [
  { to: "/", label: "Wall", icon: SquaresFour },
  { to: "/make", label: "Make", icon: MagicWand },
  { to: "/directory", label: "Directory", icon: ListMagnifyingGlass },
] as const

export function SiteNav({ className }: { className?: string }) {
  return (
    <nav
      className={cn(
        "flex items-center gap-1 rounded-2xl border border-border/80 bg-card/90 px-1.5 py-1 shadow-sm backdrop-blur-md",
        className
      )}
    >
      {links.map(({ to, label, icon: Icon }) => (
        <Link
          key={to}
          to={to}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-[11px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:bg-muted hover:text-foreground [&.active]:bg-primary [&.active]:text-primary-foreground"
          activeOptions={{ exact: to === "/" }}
        >
          <Icon weight="bold" className="size-3.5" />
          {label}
        </Link>
      ))}
    </nav>
  )
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn("group flex items-center gap-2.5", className)}
    >
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-[0.85rem] border-[3px] border-ink bg-sticker-yellow shadow-[2px_2px_0_var(--ink)] transition-transform group-hover:-rotate-3"
      >
        <span className="size-3 rounded-full bg-sticker-teal" />
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-heading text-lg font-extrabold tracking-tight text-foreground">
          Sticker Wall
        </span>
        <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          for indie makers
        </span>
      </span>
    </Link>
  )
}
