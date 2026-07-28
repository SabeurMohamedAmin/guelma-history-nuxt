import { notificationIdSchema } from '~~/server/validators/notification.validator'
import { markRead } from '~~/server/utils/notifications'
import { requireCompleteUser } from '~~/server/utils/auth'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * Mark one notification as read. Scoped to the owner inside `markRead`, so a
 * user can only mark their own. Idempotent.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireCompleteUser(event, 'user')
    const id = notificationIdSchema.parse(getRouterParam(event, 'id'))

    await markRead(user.id, id)
    return { success: true }
  }
  catch (error) {
    return toH3Error(error)
  }
})
