import { verifyMessageToken, markMessageDelivered } from '~~/server/utils/contact'
import { sendContactNotification } from '~~/server/utils/email/contact-notify'

/**
 * POST /api/contact/verify
 * Validates the single-use token from the verification email. On success the
 * message is forwarded to the site owner. On failure the client is told the
 * link is invalid/expired so the user can try again.
 */
export default defineEventHandler(async (event) => {
  const { token } = await readBody<{ token?: string }>(event)

  if (!token) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'A verification token is required.',
    })
  }

  const verified = await verifyMessageToken(token)

  if (!verified) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'This verification link is invalid or has expired. Please submit the form again.',
    })
  }

  await sendContactNotification(verified)
  await markMessageDelivered(verified.id)

  return { message: 'Your email is confirmed and your message has been sent. Thank you!' }
})
