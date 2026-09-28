import { useRouteContext } from "@tanstack/react-router"
import { SiteHeader } from "@/components/site-header"

/** Shared chrome for auth / files pages — keeps the sticker wall full-bleed. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const { session } = useRouteContext({ from: "__root__" })

  return (
    <div className="flex min-h-svh flex-col px-6 py-8 sm:px-10">
      <SiteHeader user={session?.user ?? null} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  )
}
