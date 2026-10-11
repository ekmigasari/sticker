/** Better Auth stores roles as a comma-separated list. */
export function isAdminRole(role: string | null | undefined): boolean {
  return (role ?? "").split(",").some((r) => r.trim() === "admin")
}

/** A ban with a past expiry lifts at the user's next sign-in. */
export function isBanActive(user: {
  banned?: boolean | null
  banExpires?: Date | string | null
}): boolean {
  if (!user.banned) return false
  return !user.banExpires || new Date(user.banExpires).getTime() > Date.now()
}
