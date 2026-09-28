import { createFileRoute, redirect } from "@tanstack/react-router"
import { AuthForm } from "@/components/auth-form"
import { AppChrome } from "@/components/layout/app-chrome"

export const Route = createFileRoute("/sign-up")({
  beforeLoad: ({ context }) => {
    if (context.session) {
      throw redirect({ to: "/dashboard" })
    }
  },
  component: SignUpPage,
})

function SignUpPage() {
  return (
    <AppChrome>
      <main className="mx-auto flex w-full max-w-lg flex-col px-4 py-14 sm:px-8">
        <p className="font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
          Account
        </p>
        <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
          Create an account
        </h1>
        <p className="mt-3 text-muted-foreground">
          Join Sticker Wall to list products and keep stickers tied to your
          maker profile.
        </p>
        <div className="mt-10 rounded-3xl border border-border bg-card/90 p-5 sm:p-7">
          <AuthForm mode="sign-up" />
        </div>
      </main>
    </AppChrome>
  )
}
