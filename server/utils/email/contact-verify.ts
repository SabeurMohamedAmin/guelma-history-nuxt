/**
 * Sends the sender a verification email containing a single-use button.
 * Clicking it confirms they control the address before the message is
 * forwarded to the site owner.
 *
 * Uses useResend() from the nuxt-resend module. In development (or when no API
 * key is configured) it logs the link to the server console instead of failing,
 * so the flow is fully testable without email infrastructure. In production a
 * missing key throws loudly.
 */
export async function sendContactVerificationEmail(to: string, name: string, verifyUrl: string): Promise<void> {
  if (!isEmailEnabled()) {
    if (import.meta.dev) {
      console.info(`[contact-verify] Email disabled (no NUXT_RESEND_API_KEY). Verify link for ${to}:\n${verifyUrl}`)
      return
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Email not configured',
      message: 'NUXT_RESEND_API_KEY is required to send verification emails.',
    })
  }

  const { emails } = useResend()

  await emails.send({
    from: getResendFromEmail(),
    to,
    subject: '\u062a\u0623\u0643\u064a\u062f \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u2014 Confirmez votre adresse e-mail',
    html: buildVerifyEmailHtml(name, verifyUrl),
  })
}

/** Minimal bilingual HTML body for the verification email. */
function buildVerifyEmailHtml(name: string, verifyUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Guelma History \u2014 \u062a\u0627\u0631\u064a\u062e \u0642\u0627\u0644\u0645\u0629</h2>
      <p>\u0645\u0631\u062d\u0628\u0627\u064b ${escapeHtml(name)}\u060c</p>
      <p>\u0644\u0642\u062f \u0627\u0633\u062a\u0644\u0645\u0646\u0627 \u0631\u0633\u0627\u0644\u062a\u0643. \u0627\u0636\u063a\u0637 \u0627\u0644\u0632\u0631 \u0623\u062f\u0646\u0627\u0647 \u0644\u062a\u0623\u0643\u064a\u062f \u0628\u0631\u064a\u062f\u0643 \u0648\u0625\u0631\u0633\u0627\u0644\u0647\u0627 (\u0635\u0627\u0644\u062d \u0644\u0645\u062f\u0629 60 \u062f\u0642\u064a\u0642\u0629).</p>
      <p>Nous avons re\u00e7u votre message. Cliquez sur le bouton ci-dessous pour confirmer votre adresse et l'envoyer (valable 60 minutes).</p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}"
           style="background:#8B6914;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
          Confirm &amp; send message
        </a>
      </p>
      <p style="color:#888;font-size:12px;">
        If you didn't send this message, you can safely ignore this email.
      </p>
    </div>
  `
}

/** Escape user-supplied text before interpolating into the HTML email. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
