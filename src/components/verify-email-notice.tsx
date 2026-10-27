import { useState } from "react"
import { EnvelopeSimple } from "@phosphor-icons/react"
import { authClient } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

/** Shown when paying is blocked until the buyer confirms their email. */
export function VerifyEmailNotice({
  email,
  className,
}: {
  email: string
  className?: string
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  )

  async function send() {
    setState("sending")
    const result = await authClient.sendVerificationEmail({
      email,
      callbackURL: window.location.pathname,
    })
    setState(result.error ? "error" : "sent")
  }

  return (
    <div
      role="status"
      className={cn(
        "rounded-[16px] bg-[#f5f5f7] px-4 py-3.5 text-[14px] leading-snug text-neutral-600",
        className
      )}
    >
      <p className="flex items-start gap-2">
        <EnvelopeSimple
          weight="fill"
          className="mt-0.5 size-4 shrink-0 text-neutral-900"
        />
        <span>
          Confirm your email before paying. Open the link we sent to{" "}
          <strong className="font-semibold break-all text-neutral-900">
            {email}
          </strong>
          , then come back here.
        </span>
      </p>
      <button
        type="button"
        onClick={send}
        disabled={state === "sending" || state === "sent"}
        className="press mt-2.5 ml-6 text-[14px] font-semibold text-[#0071e3] disabled:text-neutral-400"
      >
        {state === "sending"
          ? "Sending…"
          : state === "sent"
            ? "Sent. Check your inbox."
            : state === "error"
              ? "Couldn't send. Try again"
              : "Send the link again"}
      </button>
    </div>
  )
}
