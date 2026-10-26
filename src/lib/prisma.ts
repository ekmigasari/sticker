import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../generated/prisma/client"

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set")
}

const adapter = new PrismaPg({ connectionString: databaseUrl })

/**
 * Better Auth writes `lastRequest` as a JS number. The column is BigInt
 * (epoch ms does not fit in a 32-bit int), so coerce it on the way in.
 */
function coerceLastRequest(value: unknown): void {
  if (!value || typeof value !== "object") return
  if (Array.isArray(value)) {
    for (const item of value) coerceLastRequest(item)
    return
  }
  const record = value as Record<string, unknown>
  if ("lastRequest" in record) {
    const current = record.lastRequest
    if (typeof current === "number") {
      record.lastRequest = BigInt(Math.trunc(current))
    } else if (
      current &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      const filter = current as Record<string, unknown>
      for (const [key, inner] of Object.entries(filter)) {
        if (typeof inner === "number") filter[key] = BigInt(Math.trunc(inner))
      }
    }
  }
  for (const [key, nested] of Object.entries(record)) {
    if (key === "lastRequest") continue
    if (nested && typeof nested === "object") coerceLastRequest(nested)
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

const base = new PrismaClient({ adapter }).$extends({
  query: {
    rateLimit: {
      $allOperations({ args, query }) {
        coerceLastRequest(args)
        return query(args)
      },
    },
  },
})

export const prisma = (globalForPrisma.prisma ??
  base) as unknown as PrismaClient

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
