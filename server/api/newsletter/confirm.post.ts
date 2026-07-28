import { newsletterConfirmSchema } from '~~/server/validators/newsletter.validator'
import { confirmSubscription } from '~~/server/utils/newsletter'

/**
 * POST /api/newsletter/confirm
 * Validates the single-use token from the confirmation email and activates the
 * subscription. On failure the client is told the link is invalid/expired so the
 * user can subscribe again.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token } = newsletterConfirmSchema.parse(body)

  const confirmed = await confirmSubscription(token)

  if (!confirmed) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'This confirmation link is invalid or has expired. Please subscribe again.',
    })
  }

  return { message: 'Your subscription is confirmed. Thank you!' }
})
