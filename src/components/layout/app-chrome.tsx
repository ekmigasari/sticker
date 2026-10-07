import { AccountButton, BrandMark, SiteNav } from "@/components/layout/site-nav"
import { SiteFooter } from "@/components/layout/site-footer"
import { cn } from "@/lib/utils"

type Props = {
  children: React.ReactNode
  /** Full-bleed wall homepage hides the standard page padding. */
  variant?: "page" | "wall" | "bare"
}

/** Floating glass controls, shared by the wall overlay and regular pages. */
function TopBar({ wall }: { wall: boolean }) {
  return (
    <header
      data-ui-chrome
      className={cn(
        "pointer-events-none top-0 right-0 left-0 z-40 grid h-14 grid-cols-[1fr_auto_1fr] items-center gap-1.5 px-3 pt-[env(safe-area-inset-top)] sm:px-5",
        wall ? "absolute" : "sticky"
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
  )
}

export function AppChrome({ children, variant = "page" }: Props) {
  if (variant === "bare") return <>{children}</>

  if (variant === "wall") {
    return (
      <div className="bg-wall relative min-h-svh font-ui text-neutral-900 antialiased">
        <TopBar wall />
        {children}
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col bg-white font-ui text-neutral-900 antialiased">
      <TopBar wall={false} />
      <main className="flex-1 pb-16">{children}</main>
      <SiteFooter />
    </div>
  )
}
