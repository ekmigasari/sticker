import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
import { safeNextPath } from "@/lib/auth-redirect"

export function AuthForm({
  mode,
  next,
}: {
  mode: "sign-in" | "sign-up"
  next?: string
}) {
  const navigate = useNavigate()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const isSignUp = mode === "sign-up"
  const destination = safeNextPath(next)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setPending(true)
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email") ?? "")
    const password = String(form.get("password") ?? "")
    const name = String(form.get("name") ?? "")

    const result = isSignUp
      ? await authClient.signUp.email({ email, password, name })
      : await authClient.signIn.email({ email, password })

    if (result.error) {
      setPending(false)
      setError(result.error.message ?? "Something went wrong.")
      return
    }

    await router.invalidate()
    if (destination === "/place") {
      await navigate({ to: "/place" })
    } else if (destination === "/dashboard") {
      await navigate({ to: "/dashboard" })
    } else if (destination.startsWith("/dashboard/products/")) {
      const id = destination.slice("/dashboard/products/".length)
      await navigate({
        to: "/dashboard/products/$id",
        params: { id },
      })
    } else {
      router.history.push(destination)
    }
  }

  return (
    <form onSubmit={onSubmit} className="font-ui flex flex-col gap-5">
      {isSignUp ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="nk-label">
            Name
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            className="nk-field"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="nk-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="nk-field"
        />
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="nk-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignUp ? "new-password" : "current-password"}
          minLength={8}
          required
          className="nk-field"
        />
      </div>
      {error ? (
        <p className="text-[14px] font-medium text-red-600">{error}</p>
      ) : null}
      <button type="submit" disabled={pending} className="nk-btn w-full">
        {pending ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
      </button>
      <p className="text-center text-[14px] text-neutral-500">
        {isSignUp ? (
          <>
            Already have an account?{" "}
            <Link
              to="/sign-in"
              search={{ next: destination === "/dashboard" ? undefined : destination }}
              className="font-medium text-neutral-900 underline underline-offset-4"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              to="/sign-up"
              search={{ next: destination === "/dashboard" ? undefined : destination }}
              className="font-medium text-neutral-900 underline underline-offset-4"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
