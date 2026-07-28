import { notificationIdSchema } from '~~/server/validators/notification.validator'
import { deleteNotification } from '~~/server/utils/notifications'
import { requireCompleteUser } from '~~/server/utils/auth'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * Delete one notification from the current user's menu. Scoped inside the
 * domain helper so users can only delete their own notifications.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireCompleteUser(event, 'user')
    const id = notificationIdSchema.parse(getRouterParam(event, 'id'))

    await deleteNotification(user.id, id)
    return { success: true }
  }
  catch (error) {
    return toH3Error(error)
  }
})
