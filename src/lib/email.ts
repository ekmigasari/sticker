/** Resend's shared test sender only delivers to the Resend account's own email. */
const DEFAULT_FROM = "Cool Things on the Internet <onboarding@resend.dev>"

export function emailEnabled() {
  return Boolean(process.env.RESEND_API_KEY)
}

export async function sendEmail(message: {
  to: string
  subject: string
  html: string
  text: string
}) {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is not set")
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || DEFAULT_FROM,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
  })
  if (!response.ok) {
    throw new Error(
      `Resend rejected the email (${response.status}): ${await response.text()}`
    )
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

export function verificationEmail(name: string, url: string) {
  const hello = name.trim() ? `Hi ${name.trim()},` : "Hi,"
  return {
    subject: "Confirm your email",
    text: `${hello}\n\nConfirm your email for Cool Things on the Internet so you can put stickers on the wall:\n\n${url}\n\nIf you didn't create an account, ignore this email.`,
    html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#171717">
  <p style="font-size:16px">${escapeHtml(hello)}</p>
  <p style="font-size:16px;line-height:1.5">Confirm your email for Cool Things on the Internet so you can put stickers on the wall.</p>
  <p style="margin:28px 0"><a href="${escapeHtml(url)}" style="background:#171717;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;font-size:15px">Confirm email</a></p>
  <p style="font-size:13px;color:#737373">If you didn't create an account, ignore this email.</p>
</div>`,
  }
}
