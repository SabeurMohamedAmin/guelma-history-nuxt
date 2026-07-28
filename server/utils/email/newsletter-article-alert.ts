export interface NewsletterArticleAlertEmailInput {
  to: string
  title: string
  articleUrl: string
  unsubscribeUrl: string
}

/**
 * Sends one active subscriber a new-article newsletter alert.
 *
 * The caller owns deciding whether the article was first published and whether
 * this subscriber already received it. This utility only renders/sends the
 * email and always includes the unsubscribe link required by the newsletter
 * rules.
 */
export async function sendNewsletterArticleAlert(input: NewsletterArticleAlertEmailInput): Promise<void> {
  if (!isEmailEnabled()) {
    if (import.meta.dev) {
      console.info(
        `[newsletter-article-alert] Email disabled (no NUXT_RESEND_API_KEY). Article alert for ${input.to}:\n${input.articleUrl}\nUnsubscribe: ${input.unsubscribeUrl}`,
      )
      return
    }
    throw createError({
      statusCode: 500,
      statusMessage: 'Email not configured',
      message: 'NUXT_RESEND_API_KEY is required to send newsletter article alerts.',
    })
  }

  const { emails } = useResend()

  await emails.send({
    from: getResendFromEmail(),
    to: input.to,
    subject: `New article published: ${input.title}`,
    html: buildArticleAlertEmailHtml(input),
  })
}

function buildArticleAlertEmailHtml(input: NewsletterArticleAlertEmailInput): string {
  const title = escapeHtml(input.title)
  const articleUrl = escapeHtml(input.articleUrl)
  const unsubscribeUrl = escapeHtml(input.unsubscribeUrl)

  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; line-height: 1.6;">
      <h2 style="margin-bottom: 16px;">Guelma History — تاريخ قالمة</h2>

      <p>Hi,</p>
      <p>A new article has just been published:</p>

      <h3 style="margin: 20px 0;">${title}</h3>

      <p style="margin: 24px 0;">
        <a href="${articleUrl}"
           style="background:#8B6914;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">
          Read article
        </a>
      </p>

      <p>If the button does not work, copy this link:</p>
      <p><a href="${articleUrl}">${articleUrl}</a></p>

      <hr style="border:none;border-top:1px solid #eee;margin:28px 0;" />

      <p style="color:#777;font-size:12px;">
        You are receiving this email because you confirmed your newsletter subscription.
        <br />
        <a href="${unsubscribeUrl}" style="color:#777;">Unsubscribe from article alerts</a>
      </p>
    </div>
  `
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#039;')
}
