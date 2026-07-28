/**
 * Sends the admin password-reset email.
 *
 * Uses useResend() from the nuxt-resend module. In development (or when no API
 * key is configured) it logs the link to the server console instead of failing,
 * so the flow is fully testable without email infrastructure. In production a
 * missing key throws loudly.
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!isEmailEnabled()) {
    if (import.meta.dev) {
      console.info(`[password-reset] Email disabled (no NUXT_RESEND_API_KEY). Reset link for ${to}:\n${resetUrl}`)
      return
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Email not configured',
      message: 'NUXT_RESEND_API_KEY is required to send password reset emails.',
    })
  }

  const { emails } = useResend()

  await emails.send({
    from: getResendFromEmail(),
    to,
    subject: '\u0625\u0639\u0627\u062f\u0629 \u062a\u0639\u064a\u064a\u0646 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u2014 R\u00e9initialisation du mot de passe',
    html: buildResetEmailHtml(resetUrl),
  })
}

/** Minimal bilingual HTML body for the reset email. */
function buildResetEmailHtml(resetUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Guelma History \u2014 Admin</h2>
      <p>\u0627\u0637\u0644\u0628 \u0623\u062d\u062f\u0647\u0645 \u0625\u0639\u0627\u062f\u0629 \u062a\u0639\u064a\u064a\u0646 \u0643\u0644\u0645\u0629 \u0645\u0631\u0648\u0631 \u0627\u0644\u0645\u0634\u0631\u0641. \u0627\u0636\u063a\u0637 \u0627\u0644\u0632\u0631 \u0623\u062f\u0646\u0627\u0647 (\u0635\u0627\u0644\u062d \u0644\u0645\u062f\u0629 30 \u062f\u0642\u064a\u0642\u0629).</p>
      <p>Une r\u00e9initialisation du mot de passe administrateur a \u00e9t\u00e9 demand\u00e9e. Ce lien expire dans 30 minutes.</p>
      <p style="margin: 24px 0;">
        <a href="${resetUrl}"
           style="background:#8B6914;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
          Reset password
        </a>
      </p>
      <p style="color:#888;font-size:12px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  `
}
