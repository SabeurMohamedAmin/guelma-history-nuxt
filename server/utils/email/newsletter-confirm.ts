/**
 * Sends a subscriber a confirmation email containing a single-use link.
 * Clicking it confirms they control the address (double opt-in) before they are
 * added to the active newsletter list.
 *
 * Uses useResend() from the nuxt-resend module. In development (or when no API
 * key is configured) it logs the link to the server console instead of failing,
 * so the flow is fully testable without email infrastructure. In production a
 * missing key throws loudly.
 */
export async function sendNewsletterConfirmation(to: string, confirmUrl: string): Promise<void> {
  if (!isEmailEnabled()) {
    if (import.meta.dev) {
      console.info(`[newsletter-confirm] Email disabled (no NUXT_RESEND_API_KEY). Confirm link for ${to}:\n${confirmUrl}`)
      return
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Email not configured',
      message: 'NUXT_RESEND_API_KEY is required to send newsletter confirmation emails.',
    })
  }

  const { emails } = useResend()

  await emails.send({
    from: getResendFromEmail(),
    to,
    subject: '\u062a\u0623\u0643\u064a\u062f \u0627\u0634\u062a\u0631\u0627\u0643\u0643 \u2014 Confirmez votre abonnement',
    html: buildConfirmEmailHtml(confirmUrl),
  })
}

/** Minimal bilingual HTML body for the subscription confirmation email. */
function buildConfirmEmailHtml(confirmUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Guelma History \u2014 \u062a\u0627\u0631\u064a\u062e \u0642\u0627\u0644\u0645\u0629</h2>
      <p>\u0634\u0643\u0631\u0627\u064b \u0644\u0627\u0634\u062a\u0631\u0627\u0643\u0643! \u0627\u0636\u063a\u0637 \u0627\u0644\u0632\u0631 \u0623\u062f\u0646\u0627\u0647 \u0644\u062a\u0623\u0643\u064a\u062f \u0627\u0634\u062a\u0631\u0627\u0643\u0643 (\u0635\u0627\u0644\u062d \u0644\u0645\u062f\u0629 7 \u0623\u064a\u0627\u0645).</p>
      <p>Merci de votre inscription ! Cliquez sur le bouton ci-dessous pour confirmer votre abonnement (valable 7 jours).</p>
      <p style="margin: 24px 0;">
        <a href="${confirmUrl}"
           style="background:#8B6914;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
          Confirm subscription
        </a>
      </p>
      <p style="color:#888;font-size:12px;">
        If you didn't request this subscription, you can safely ignore this email.
      </p>
    </div>
  `
}
