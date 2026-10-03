import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useId, useState } from "react"
import { Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react"
import { authClient } from "@/lib/auth-client"
import { safeNextPath } from "@/lib/auth-redirect"
import { cn } from "@/lib/utils"

type Mode = "sign-in" | "sign-up"

const COPY: Record<
  Mode,
  { title: string; subtitle: string; placeSubtitle: string }
> = {
  "sign-in": {
    title: "Sign in to Netkraft",
    subtitle: "Manage your stickers and keep them on the wall.",
    placeSubtitle: "Sign in to finish placing your sticker.",
  },
  "sign-up": {
    title: "Create your account",
    subtitle: "One account for every sticker you put on the wall.",
    placeSubtitle: "Create an account to save your sticker details.",
  },
}

/** Full auth screen: app mark, title, grouped fields, and the mode switch. */
export function AuthScreen({ mode, next }: { mode: Mode; next?: string }) {
  const copy = COPY[mode]
  return (
    <div className="-mb-10 flex min-h-[calc(100svh-3.5rem)] justify-center bg-[#f5f5f7] px-5 pt-12 pb-16 sm:items-center sm:pt-0">
      <div className="flex w-full max-w-[22rem] flex-col items-center">
        <span
          aria-hidden
          className="grid size-16 place-items-center rounded-[18px] bg-neutral-900 text-[26px] font-semibold tracking-[-0.03em] text-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]"
        >
          N
        </span>
        <h1 className="mt-5 text-center text-[28px] leading-tight font-semibold tracking-[-0.03em] text-neutral-900">
          {copy.title}
        </h1>
        <p className="mt-2 max-w-[18rem] text-center text-[15px] leading-snug text-neutral-500">
          {next === "/place" ? copy.placeSubtitle : copy.subtitle}
        </p>
        <AuthForm mode={mode} next={next} />
      </div>
    </div>
  )
}

function GroupedField({
  label,
  last,
  trailing,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  last?: boolean
  trailing?: React.ReactNode
}) {
  const id = useId()
  return (
    <div className="relative">
      <label
        htmlFor={id}
        className="flex flex-col gap-0.5 px-4 pt-2.5 pb-2 transition-colors focus-within:bg-black/[0.02]"
      >
        <span className="text-[12px] font-medium text-neutral-500">
          {label}
        </span>
        <input
          id={id}
          {...input}
          className={cn(
            "w-full bg-transparent text-base tracking-[-0.01em] text-neutral-900 outline-none placeholder:text-neutral-300 sm:text-[17px]",
            trailing && "pr-10"
          )}
        />
      </label>
      {trailing ? (
        <div className="absolute top-1/2 right-2 -translate-y-1/2">
          {trailing}
        </div>
      ) : null}
      {last ? null : <div aria-hidden className="ml-4 h-px bg-black/[0.08]" />}
    </div>
  )
}

export function AuthForm({ mode, next }: { mode: Mode; next?: string }) {
  const navigate = useNavigate()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
    } else if (destination.startsWith("/dashboard/stickers/")) {
      const id = destination.slice("/dashboard/stickers/".length)
      await navigate({
        to: "/dashboard/stickers/$id",
        params: { id },
      })
    } else if (destination.startsWith("/dashboard/products/")) {
      const id = destination.slice("/dashboard/products/".length)
      await navigate({
        to: "/dashboard/stickers/$id",
        params: { id },
      })
    } else {
      router.history.push(destination)
    }
  }

  const switchSearch = {
    next: destination === "/dashboard" ? undefined : destination,
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-8 flex w-full flex-col gap-4 font-ui"
    >
      <div className="overflow-hidden rounded-[14px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-black/[0.06]">
        {isSignUp ? (
          <GroupedField
            label="Name"
            name="name"
            autoComplete="name"
            placeholder="Jane Appleseed"
            required
          />
        ) : null}
        <GroupedField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="name@example.com"
          required
        />
        <GroupedField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          placeholder={isSignUp ? "At least 8 characters" : "Required"}
          minLength={8}
          required
          last
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="press grid size-9 place-items-center rounded-full text-neutral-400 transition-colors hover:text-neutral-700"
            >
              {showPassword ? (
                <EyeSlash weight="regular" className="size-[18px]" />
              ) : (
                <Eye weight="regular" className="size-[18px]" />
              )}
            </button>
          }
        />
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-1.5 px-1 text-[13px] leading-snug font-medium text-red-600"
        >
          <WarningCircle weight="fill" className="mt-px size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="press mt-1 h-12 w-full rounded-full bg-neutral-900 text-[16px] font-semibold tracking-[-0.01em] text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Please wait…" : isSignUp ? "Create Account" : "Sign In"}
      </button>

      <p className="mt-2 text-center text-[14px] text-neutral-500">
        {isSignUp ? "Already have an account?" : "New to Netkraft?"}{" "}
        <Link
          to={isSignUp ? "/sign-in" : "/sign-up"}
          search={switchSearch}
          className="font-semibold text-neutral-900 hover:underline hover:underline-offset-4"
        >
          {isSignUp ? "Sign in" : "Create account"}
        </Link>
      </p>
    </form>
  )
}
