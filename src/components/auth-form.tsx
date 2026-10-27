import { Link, useNavigate, useRouter } from "@tanstack/react-router"
import { useId, useState } from "react"
import { Eye, EyeSlash, WarningCircle } from "@phosphor-icons/react"
import { track } from "@/lib/analytics"
import { authClient } from "@/lib/auth-client"
import { safeNextPath } from "@/lib/auth-redirect"
import { cn } from "@/lib/utils"

type Mode = "sign-in" | "sign-up"

const COPY: Record<
  Mode,
  { title: string; subtitle: string; placeSubtitle: string }
> = {
  "sign-in": {
    title: "Welcome back",
    subtitle: "Your stickers missed you. Sign in to manage them.",
    placeSubtitle: "Sign in to finish placing your sticker.",
  },
  "sign-up": {
    title: "Get on the wall",
    subtitle:
      "One account for every cool thing you make and every sticker you stick.",
    placeSubtitle: "Create an account to save your sticker details.",
  },
}

/** Full auth screen: app mark, title, grouped fields, and the mode switch. */
export function AuthScreen({ mode, next }: { mode: Mode; next?: string }) {
  const copy = COPY[mode]
  return (
    <div className="-mt-14 -mb-10 flex min-h-svh justify-center bg-[#f5f5f7] px-5 pt-26 pb-16 sm:items-center sm:pt-14">
      <div className="flex w-full max-w-[22rem] flex-col items-center">
        <img
          src="/logo-mark.webp"
          alt=""
          width={80}
          height={80}
          decoding="async"
          draggable={false}
          className="size-20 drop-shadow-[0_10px_20px_rgba(0,0,0,0.18)] select-none"
        />
        <h1 className="mt-5 text-center font-hand text-[38px] leading-[0.95] font-bold break-words text-neutral-900">
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
      ? await authClient.signUp.email({
          email,
          password,
          name,
          callbackURL: destination,
        })
      : await authClient.signIn.email({ email, password })

    if (result.error) {
      setPending(false)
      setError(result.error.message ?? "Something went wrong.")
      return
    }
    if (isSignUp) track("signup_completed")

    await router.invalidate()
    if (destination === "/place") {
      await navigate({ to: "/place" })
    } else if (destination === "/dashboard") {
      await navigate({ to: "/dashboard" })
    } else if (destination.startsWith("/dashboard/stickers/")) {
      const slug = destination.slice("/dashboard/stickers/".length)
      await navigate({
        to: "/dashboard/stickers/$slug",
        params: { slug },
      })
    } else if (destination.startsWith("/dashboard/products/")) {
      const slug = destination.slice("/dashboard/products/".length)
      await navigate({
        to: "/dashboard/stickers/$slug",
        params: { slug },
      })
    } else {
      router.history.push(destination)
    }
  }

  async function continueWithGoogle() {
    setError(null)
    setPending(true)
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: destination,
      errorCallbackURL: isSignUp ? "/sign-up" : "/sign-in",
    })
    if (result.error) {
      setPending(false)
      setError(result.error.message ?? "Couldn't reach Google.")
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
      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={pending}
        className="press flex h-12 w-full items-center justify-center gap-2.5 rounded-full bg-white text-[16px] font-semibold tracking-[-0.01em] text-neutral-900 ring-1 ring-black/[0.1] transition-colors hover:bg-neutral-50 disabled:opacity-60"
      >
        <GoogleMark />
        Continue with Google
      </button>
      <div
        aria-hidden
        className="flex items-center gap-3 text-[12px] font-medium text-neutral-400"
      >
        <span className="h-px flex-1 bg-black/[0.08]" />
        or
        <span className="h-px flex-1 bg-black/[0.08]" />
      </div>
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

      {isSignUp ? (
        <p className="px-2 text-center text-[12px] leading-snug text-neutral-500">
          By creating an account, you agree to the{" "}
          <Link
            to="/terms"
            target="_blank"
            className="font-medium text-neutral-900 hover:underline hover:underline-offset-4"
          >
            Terms and Conditions
          </Link>
          .
        </p>
      ) : null}

      <p className="mt-2 text-center text-[14px] text-neutral-500">
        {isSignUp
          ? "Already have an account?"
          : "New to Cool Things on the Internet?"}{" "}
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

function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 48 48" className="size-[18px]">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  )
}
