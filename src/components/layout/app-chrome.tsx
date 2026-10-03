import { AccountButton, BrandMark, SiteNav } from "@/components/layout/site-nav"
import { cn } from "@/lib/utils"

type Props = {
  children: React.ReactNode
  /** Full-bleed wall homepage hides the standard page padding. */
  variant?: "page" | "wall" | "bare"
}

export function AppChrome({ children, variant = "page" }: Props) {
  if (variant === "bare") return <>{children}</>
  const wall = variant === "wall"

  return (
    <div className="relative min-h-svh bg-white font-ui text-neutral-900 antialiased">
      <header
        data-ui-chrome
        className={cn(
          "z-40 grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 pt-[env(safe-area-inset-top)] sm:px-5",
          wall
            ? "pointer-events-none absolute top-0 right-0 left-0"
            : "sticky top-0 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl backdrop-saturate-150"
        )}
      >
        <div className="pointer-events-auto justify-self-start">
          <BrandMark compact className="sm:hidden" />
          <BrandMark className="hidden sm:flex" />
        </div>
        <SiteNav className="pointer-events-auto" />
        <div className="pointer-events-auto justify-self-end">
          <AccountButton />
        </div>
      </header>

      {wall ? children : <main className="pb-10">{children}</main>}
    </div>
  )
}
