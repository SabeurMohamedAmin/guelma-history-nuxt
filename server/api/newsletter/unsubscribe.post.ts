import { newsletterUnsubscribeSchema } from '~~/server/validators/newsletter.validator'
import { unsubscribe } from '~~/server/utils/newsletter'

/**
 * POST /api/newsletter/unsubscribe
 * Marks an active subscriber as unsubscribed using the single-click token from
 * article alert emails. The token is validated by hash in the newsletter domain.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { token } = newsletterUnsubscribeSchema.parse(body)

  const unsubscribed = await unsubscribe(token)

  if (!unsubscribed) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'This unsubscribe link is invalid or has already been used.',
    })
  }

  return { message: 'You have been unsubscribed from article alerts.' }
})
