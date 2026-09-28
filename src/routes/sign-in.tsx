import { createFileRoute, redirect } from "@tanstack/react-router"
import { AuthForm } from "@/components/auth-form"
import { AuthShell } from "@/components/auth-shell"

export const Route = createFileRoute("/sign-in")({
  beforeLoad: ({ context }) => {
    if (context.session) {
      throw redirect({ to: "/files" })
    }
  },
  component: SignInPage,
})

function SignInPage() {
  return (
    <AuthShell>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center py-16">
        <p className="font-mono text-xs tracking-[0.25em] text-muted-foreground uppercase">
          Account
        </p>
        <h1 className="mt-4 font-heading text-4xl font-medium tracking-tight">
          Sign in
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-loose text-muted-foreground">
          Use the email and password for your prototype account.
        </p>
        <div className="mt-10">
          <AuthForm mode="sign-in" />
        </div>
      </main>
    </AuthShell>
  )
}
