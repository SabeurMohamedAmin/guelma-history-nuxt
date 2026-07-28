import { createMuteSchema } from '~~/server/validators/notification.validator'
import { muteTarget } from '~~/server/utils/notifications'
import { requireCompleteUser } from '~~/server/utils/auth'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * Mute notifications for the current user. The body's `scope` decides the
 * target: 'all' (everything), 'article' (needs articleId), or 'comment' (needs
 * commentId). The validator guarantees the right target is present, and muting
 * the same thing twice is a no-op.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireCompleteUser(event, 'user')
    const payload = createMuteSchema.parse(await readBody(event))

    await muteTarget(user.id, payload)
    return { success: true }
  }
  catch (error) {
    return toH3Error(error)
  }
})
