import { Link } from "@tanstack/react-router"
import { BrandMark, SiteNav } from "@/components/layout/site-nav"
import { cn } from "@/lib/utils"

type Props = {
  children: React.ReactNode
  /** Full-bleed wall homepage hides the standard page padding. */
  variant?: "page" | "wall" | "bare"
}

export function AppChrome({ children, variant = "page" }: Props) {
  if (variant === "bare") return <>{children}</>

  return (
    <div
      className={cn(
        "font-ui relative min-h-svh text-neutral-900 antialiased",
        variant === "wall" ? "bg-[#f5f5f7]" : "bg-white"
      )}
    >
      <header
        data-ui-chrome
        className={cn(
          "z-40 flex h-14 items-center justify-between gap-3 px-3 pt-[env(safe-area-inset-top)] sm:px-5",
          variant === "wall"
            ? "pointer-events-none absolute top-0 right-0 left-0"
            : "sticky top-0 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl backdrop-saturate-150"
        )}
      >
        <div className={cn(variant === "wall" && "pointer-events-auto")}>
          <BrandMark />
        </div>
        <div
          className={cn(
            "flex items-center gap-2",
            variant === "wall" && "pointer-events-auto"
          )}
        >
          <SiteNav className="hidden sm:flex" />
          <Link
            to="/make"
            className="press inline-flex h-10 items-center rounded-full bg-neutral-900 px-4 text-[14px] font-semibold tracking-[-0.01em] text-white transition-opacity hover:opacity-90 sm:hidden"
          >
            Create
          </Link>
          {variant === "wall" ? null : (
            <Link
              to="/make"
              className="press hidden h-10 items-center rounded-full bg-neutral-900 px-5 text-[14px] font-semibold tracking-[-0.01em] text-white transition-opacity hover:opacity-90 sm:inline-flex"
            >
              Create sticker
            </Link>
          )}
        </div>
      </header>

      {variant === "wall" ? (
        children
      ) : (
        <main className="pb-20 sm:pb-10">{children}</main>
      )}

      {variant === "page" ? (
        <nav className="fixed right-3 bottom-3 left-3 z-40 flex justify-center sm:hidden">
          <SiteNav />
        </nav>
      ) : null}
    </div>
  )
}
