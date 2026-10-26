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

function createClient(): PrismaClient {
  return new PrismaClient({ adapter }).$extends({
    query: {
      rateLimit: {
        $allOperations({ args, query }) {
          coerceLastRequest(args)
          return query(args)
        },
      },
    },
  }) as unknown as PrismaClient
}

/**
 * Dev reuses one client across reloads, but only while it was built from the
 * same generated client. After `prisma generate` the class changes, so a
 * cached client would still validate against the old schema.
 */
const globalForPrisma = globalThis as unknown as {
  prismaCache?: { client: PrismaClient; source: typeof PrismaClient }
}

const cached = globalForPrisma.prismaCache
const reusable = cached?.source === PrismaClient ? cached.client : null
if (cached && !reusable) void cached.client.$disconnect().catch(() => {})

export const prisma = reusable ?? createClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaCache = { client: prisma, source: PrismaClient }
}
