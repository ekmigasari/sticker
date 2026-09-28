import { Link, useNavigate, useRouteContext, useRouter } from "@tanstack/react-router"
import { BrandMark, SiteNav } from "@/components/layout/site-nav"
import { Button, buttonVariants } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

type Props = {
  children: React.ReactNode
  /** Full-bleed wall homepage hides the standard page padding. */
  variant?: "page" | "wall" | "bare"
}

export function AppChrome({ children, variant = "page" }: Props) {
  const { session } = useRouteContext({ from: "__root__" })
  const router = useRouter()
  const navigate = useNavigate()

  if (variant === "bare") return <>{children}</>

  async function signOut() {
    await authClient.signOut()
    await router.invalidate()
    await navigate({ to: "/" })
  }

  return (
    <div className="relative min-h-svh">
      <header
        data-ui-chrome
        className={cn(
          "z-40 flex items-center justify-between gap-3 px-3 py-3 sm:px-5",
          variant === "wall"
            ? "pointer-events-none absolute top-0 right-0 left-0"
            : "border-b border-border/70 bg-background/80 backdrop-blur-md"
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
          {session ? (
            <Button
              variant="outline"
              size="sm"
              className="hidden rounded-xl sm:inline-flex"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          ) : null}
          <Link
            to="/make"
            className={cn(
              buttonVariants({ size: "sm" }),
              "rounded-xl shadow-sm sm:hidden"
            )}
          >
            Make
          </Link>
          <Link
            to="/make"
            className={cn(
              buttonVariants({ size: "sm" }),
              "hidden rounded-xl shadow-sm sm:inline-flex"
            )}
          >
            Make a sticker
          </Link>
        </div>
      </header>

      {variant === "wall" ? (
        children
      ) : (
        <main className="pb-16">{children}</main>
      )}

      {variant === "page" ? (
        <nav className="fixed right-3 bottom-3 left-3 z-40 flex justify-center sm:hidden">
          <SiteNav />
        </nav>
      ) : null}
    </div>
  )
}
