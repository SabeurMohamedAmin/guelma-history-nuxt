import { markAllRead } from '~~/server/utils/notifications'
import { requireCompleteUser } from '~~/server/utils/auth'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * Mark every unread notification for the current user as read (the "mark all
 * as read" action in the bell dropdown). Requires a completed account.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireCompleteUser(event, 'user')
    await markAllRead(user.id)
    return { success: true }
  }
  catch (error) {
    return toH3Error(error)
  }
})
