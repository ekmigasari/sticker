import { createFileRoute } from "@tanstack/react-router"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Change the sign-in email. Requires the current password. */
export const Route = createFileRoute("/api/account/email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const session = await auth.api.getSession({ headers: request.headers })
        if (!session) {
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = (await request.json().catch(() => null)) as {
          newEmail?: unknown
          password?: unknown
        } | null
        const newEmail =
          typeof body?.newEmail === "string"
            ? body.newEmail.trim().toLowerCase()
            : ""
        const password = typeof body?.password === "string" ? body.password : ""
        if (!EMAIL_RE.test(newEmail) || newEmail.length > 254) {
          return Response.json(
            { error: "Enter a valid email address." },
            { status: 400 }
          )
        }
        if (newEmail === session.user.email.toLowerCase()) {
          return Response.json(
            { error: "That's already your email." },
            { status: 400 }
          )
        }

        try {
          await auth.api.verifyPassword({
            body: { password },
            headers: request.headers,
          })
        } catch {
          return Response.json(
            { error: "Your current password is incorrect." },
            { status: 400 }
          )
        }

        const taken = await prisma.user.findUnique({
          where: { email: newEmail },
          select: { id: true },
        })
        if (taken) {
          return Response.json(
            { error: "That email is already used by another account." },
            { status: 409 }
          )
        }

        try {
          await auth.api.changeEmail({
            body: { newEmail },
            headers: request.headers,
          })
        } catch {
          return Response.json(
            {
              error:
                "Email changes need a verification email, which isn't set up yet.",
            },
            { status: 400 }
          )
        }
        return Response.json({ email: newEmail })
      },
    },
  },
})
