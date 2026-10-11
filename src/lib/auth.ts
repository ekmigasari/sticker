import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { admin } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { prisma } from "./prisma"

const secret = process.env.BETTER_AUTH_SECRET
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"

if (!secret) {
  throw new Error("BETTER_AUTH_SECRET is not set")
}

/** Accounts with these emails become admins the next time they sign in. */
const adminEmails = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)

export const auth = betterAuth({
  secret,
  baseURL,
  trustedOrigins: [baseURL],
  emailAndPassword: {
    enabled: true,
  },
  user: {
    // No email sender is configured, so a change applies immediately (only
    // possible while the account's email is unverified).
    changeEmail: { enabled: true, updateEmailWithoutVerification: true },
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  databaseHooks: {
    session: {
      create: {
        async after(session) {
          if (!adminEmails.length) return
          await prisma.user.updateMany({
            where: {
              id: session.userId,
              email: { in: adminEmails, mode: "insensitive" },
              OR: [{ role: null }, { role: { not: { contains: "admin" } } }],
            },
            data: { role: "admin" },
          })
        },
      },
    },
  },
  advanced: {
    database: {
      joins: true,
    },
  },
  plugins: [
    admin({
      bannedUserMessage:
        "This account has been banned. Contact support if you think this is a mistake.",
    }),
    tanstackStartCookies(),
  ],
})
