import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { authClient } from "@/lib/auth-client"
import { SITE_NAME } from "@/lib/seo"
import { Button } from "@/components/ui/button"

export function SiteHeader({
  user,
}: {
  user: { name: string; email: string } | null
}) {
  const router = useRouter()
  const navigate = useNavigate()

  async function signOut() {
    await authClient.signOut()
    await router.invalidate()
    await navigate({ to: "/" })
  }

  return (
    <header className="flex items-center justify-between gap-4">
      <Link to="/" aria-label={`${SITE_NAME} home`}>
        <img
          src="/logo.webp"
          alt=""
          width={77}
          height={36}
          decoding="async"
          className="h-9 w-auto select-none"
        />
      </Link>
      <nav className="flex items-center gap-4">
        {user ? (
          <>
            <Link
              to="/files"
              className="font-mono text-xs tracking-[0.15em] text-muted-foreground uppercase"
            >
              Files
            </Link>
            <span className="hidden font-mono text-xs text-muted-foreground sm:inline">
              {user.email}
            </span>
            <Button variant="outline" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </>
        ) : (
          <Link
            to="/sign-in"
            className="font-mono text-xs tracking-[0.15em] text-muted-foreground uppercase"
          >
            Sign in
          </Link>
        )}
      </nav>
    </header>
  )
}
