/**
 * Sends the email-address verification email.
 *
 * Mirrors sendPasswordResetEmail: in development (or with no API key) it logs
 * the link to the console so the flow is testable without email infrastructure;
 * in production a missing key throws.
 */
export async function sendEmailVerificationEmail(to: string, verifyUrl: string): Promise<void> {
  if (!isEmailEnabled()) {
    if (import.meta.dev) {
      console.info(`[email-verification] Email disabled (no NUXT_RESEND_API_KEY). Verify link for ${to}:\n${verifyUrl}`)
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
    subject: '\u062a\u0623\u0643\u064a\u062f \u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u2014 V\u00e9rification de l\u2019adresse e-mail',
    html: buildVerifyEmailHtml(verifyUrl),
  })
}

function buildVerifyEmailHtml(verifyUrl: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Guelma History</h2>
      <p>\u0623\u0643\u0651\u062f \u0628\u0631\u064a\u062f\u0643 \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a \u0628\u0627\u0644\u0636\u063a\u0637 \u0639\u0644\u0649 \u0627\u0644\u0632\u0631 \u0623\u062f\u0646\u0627\u0647 (\u0635\u0627\u0644\u062d \u0644\u0645\u062f\u0629 24 \u0633\u0627\u0639\u0629).</p>
      <p>Confirmez votre adresse e-mail en cliquant sur le bouton ci-dessous. Ce lien expire dans 24 heures.</p>
      <p style="margin: 24px 0;">
        <a href="${verifyUrl}"
           style="background:#8B6914;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
          Verify email
        </a>
      </p>
      <p style="color:#888;font-size:12px;">
        If you didn't create an account, you can safely ignore this email.
      </p>
    </div>
  `
}
