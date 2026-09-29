import { createFileRoute, redirect } from "@tanstack/react-router"
import { AuthForm } from "@/components/auth-form"
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
  const continuingPlace = next === "/place"

  return (
    <AppChrome>
      <main className="nk-page max-w-md">
        <header>
          <h1 className="nk-title">Sign in</h1>
          <p className="nk-subtitle mt-3">
            {continuingPlace
              ? "Sign in to continue — next you’ll add title, description, link, and category for the wall."
              : "Sign in to manage your stickers and set them up for the wall."}
          </p>
        </header>
        <div className="rounded-[28px] border border-black/[0.06] bg-white p-5 sm:p-7">
          <AuthForm mode="sign-in" next={next} />
        </div>
      </main>
    </AppChrome>
  )
}
