import { APIError } from "better-auth/api"
import { prisma } from "@/lib/prisma"
import { isAdminRole } from "@/lib/roles"
import { deleteObject } from "@/lib/s3"
import { clearFromWall } from "@/lib/wall"

/**
 * Self-serve account deletion.
 *
 * Required by the GDPR right to erasure, the CCPA right to delete, and Apple's
 * rule that an app which lets someone create an account must also let them
 * delete it. Password confirmation happens in Better Auth before this runs.
 * The only hold is the last remaining admin, so the service is not locked out
 * of its own moderation tools. That person can delete after appointing someone else.
 */
export async function assertSelfDeletable(user: {
  id: string
  role?: string | null
}) {
  if (!isAdminRole(user.role)) return
  const admins = await prisma.user.count({
    where: { role: { contains: "admin" } },
  })
  if (admins <= 1) {
    throw APIError.from("BAD_REQUEST", {
      code: "LAST_ADMIN",
      message: "Appoint another admin before you delete this account.",
    })
  }
}

/**
 * Removes stickers (and frees their wall plots) and deletes stored files.
 * The user row, sessions, and password are removed by the caller after this.
 * Files go first: if storage fails, the account is still intact and can be retried.
 */
export async function purgeUserContent(userId: string) {
  const [uploads, stickers] = await Promise.all([
    prisma.upload.findMany({ where: { userId }, select: { key: true } }),
    prisma.sticker.findMany({ where: { userId }, select: { id: true } }),
  ])

  const failures: string[] = []
  await Promise.all(
    uploads.map(async (upload) => {
      try {
        await deleteObject(upload.key)
      } catch {
        failures.push(upload.key)
      }
    })
  )
  if (failures.length) {
    throw new Error(
      "Could not delete stored files. The account was not removed. Try again."
    )
  }

  const ids = stickers.map((sticker) => sticker.id)
  if (!ids.length) return
  await prisma.$transaction(
    async (tx) => {
      await clearFromWall(tx, ids)
      await tx.sticker.deleteMany({ where: { id: { in: ids } } })
    },
    { timeout: 30_000 }
  )
}
