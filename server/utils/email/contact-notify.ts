import type { VerifiedContactMessage } from '~~/server/utils/contact'

/**
 * Forwards a verified contact message to the site owner's inbox.
 * `replyTo` is set to the sender so the owner can reply directly.
 *
 * Uses useResend() from the nuxt-resend module. In development (or when no API
 * key / owner inbox is configured) it logs the message to the server console
 * instead of failing.
 */
export async function sendContactNotification(msg: VerifiedContactMessage): Promise<void> {
  const ownerEmail = useRuntimeConfig().contactOwnerEmail

  if (!isEmailEnabled() || !ownerEmail) {
    if (import.meta.dev) {
      console.info(`[contact-notify] Email disabled. Verified message from ${msg.name} <${msg.email}>:\n${msg.message}`)
      return
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Email not configured',
      message: 'NUXT_RESEND_API_KEY and NUXT_CONTACT_OWNER_EMAIL are required to deliver contact messages.',
    })
  }

  const { emails } = useResend()

  await emails.send({
    from: getResendFromEmail(),
    to: ownerEmail,
    replyTo: msg.email,
    subject: `New contact message from ${msg.name}`,
    html: buildNotificationHtml(msg),
    attachments: msg.attachments.map(attachment => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
    })),
  })
}

function buildNotificationHtml(msg: VerifiedContactMessage): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto;">
      <h2>New verified contact message</h2>
      <p><strong>From:</strong> ${escapeHtml(msg.name)} &lt;${escapeHtml(msg.email)}&gt;</p>
      ${buildAttachmentsHtml(msg)}
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
      <p style="white-space: pre-wrap;">${escapeHtml(msg.message)}</p>
    </div>
  `
}

function buildAttachmentsHtml(msg: VerifiedContactMessage): string {
  if (!msg.attachments.length) return ''

  const listItems = msg.attachments
    .map(file => `<li>${escapeHtml(file.filename)} (${formatFileSize(file.size)})</li>`)
    .join('')

  return `<p><strong>Attachments:</strong></p><ul>${listItems}</ul>`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
