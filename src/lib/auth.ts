import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { admin } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { assertSelfDeletable, purgeUserContent } from "./account-deletion"
import { prisma } from "./prisma"

const production = process.env.NODE_ENV === "production"

/**
 * Per-IP auth limits. Production uses the usual credential-stuffing caps.
 * Development stays loose so signing in while building isn't blocked, and
 * tests skip the limiter entirely.
 *
 * Windows are seconds. Better Auth cools down for one full window after the
 * cap is hit. Storage is Postgres so more than one server shares the counter.
 */
const authRateLimit = production
  ? {
      "/sign-in/email": { window: 15 * 60, max: 5 },
      "/sign-up/email": { window: 60 * 60, max: 5 },
      "/change-password": { window: 15 * 60, max: 5 },
      "/change-email": { window: 15 * 60, max: 5 },
      "/delete-user": { window: 60 * 60, max: 5 },
    }
  : {
      "/sign-in/email": { window: 60, max: 30 },
      "/sign-up/email": { window: 60, max: 20 },
      "/change-password": { window: 60, max: 20 },
      "/change-email": { window: 60, max: 20 },
      "/delete-user": { window: 60, max: 10 },
    }

const trustedProxies = (
  process.env.TRUSTED_PROXIES ??
  "127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
)
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean)

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
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const role =
          "role" in user && (typeof user.role === "string" || user.role == null)
            ? user.role
            : null
        await assertSelfDeletable({ id: user.id, role })
        await purgeUserContent(user.id)
      },
    },
  },
  rateLimit: {
    enabled: process.env.NODE_ENV !== "test",
    window: 60,
    max: production ? 100 : 1000,
    storage: "database",
    customRules: authRateLimit,
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
    ipAddress: {
      // Cloudflare sets cf-connecting-ip and strips a client-supplied value.
      // Otherwise trust X-Forwarded-For only from TRUSTED_PROXIES.
      ipAddressHeaders: ["cf-connecting-ip", "x-real-ip", "x-forwarded-for"],
      trustedProxies,
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
