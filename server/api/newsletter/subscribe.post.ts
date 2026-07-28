import { newsletterSubscribeSchema } from '~~/server/validators/newsletter.validator'
import { requestSubscription } from '~~/server/utils/newsletter'
import { sendNewsletterConfirmation } from '~~/server/utils/email/newsletter-confirm'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * POST /api/newsletter/subscribe
 * Creates a pending subscription and emails the address a confirmation link.
 * The address is NOT added to the active list until the link is clicked.
 *
 * To avoid leaking which addresses are already subscribed, the response is the
 * same generic message whether the email is new, pending or already confirmed.
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { email } = newsletterSubscribeSchema.parse(body)

    const { rawToken, alreadyConfirmed } = await requestSubscription(email)

    if (!alreadyConfirmed) {
      const { public: { siteUrl } } = useRuntimeConfig()
      const confirmUrl = `${siteUrl}/newsletter/confirm?token=${rawToken}`
      await sendNewsletterConfirmation(email, confirmUrl)
    }

    return { message: 'Please check your inbox to confirm your subscription.' }
  }
  catch (error) {
    return toH3Error(error)
  }
})
