import { createFileRoute, redirect } from "@tanstack/react-router"
import { AuthScreen } from "@/components/auth-form"
import { AppChrome } from "@/components/layout/app-chrome"
import { safeNextPath } from "@/lib/auth-redirect"

type AuthSearch = { next?: string }

export const Route = createFileRoute("/sign-in")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    next:
      typeof search.next === "string" && search.next.length > 0
        ? search.next
        : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    if (context.session) {
      const next = safeNextPath(search.next)
      if (next === "/place") throw redirect({ to: "/place" })
      if (next === "/dashboard") throw redirect({ to: "/dashboard" })
      throw redirect({ to: "/dashboard" })
    }
  },
  component: SignInPage,
})

function SignInPage() {
  const { next } = Route.useSearch()
  return (
    <AppChrome>
      <AuthScreen mode="sign-in" next={next} />
    </AppChrome>
  )
}
