/** Paying needs a confirmed email; `email` is where the link goes. */
export class EmailUnverifiedError extends Error {
  constructor(readonly email: string) {
    super("Confirm your email before paying.")
  }
}

type PurchasePayload = {
  error?: string
  code?: string
  email?: string
  checkoutUrl?: string
}

/**
 * Read a wall purchase response. When the server hands back a Dodo checkout,
 * the browser goes there and the promise never settles: the page is leaving.
 */
export async function readPurchase<T>(
  response: Response,
  signInMessage: string
): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | (T & PurchasePayload)
    | null
  if (!response.ok) {
    if (response.status === 401) throw new Error(signInMessage)
    if (payload?.code === "email_unverified") {
      throw new EmailUnverifiedError(payload.email ?? "")
    }
    throw new Error(payload?.error ?? "Request failed.")
  }
  if (payload?.checkoutUrl) {
    window.location.assign(payload.checkoutUrl)
    return new Promise<T>(() => {})
  }
  return payload as T
}
