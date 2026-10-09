import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { prisma } from "./prisma"

const secret = process.env.BETTER_AUTH_SECRET
const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000"

if (!secret) {
  throw new Error("BETTER_AUTH_SECRET is not set")
}

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
  advanced: {
    database: {
      joins: true,
    },
  },
  plugins: [tanstackStartCookies()],
})
