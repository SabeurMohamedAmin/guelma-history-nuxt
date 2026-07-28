import { listNotificationsSchema } from '~~/server/validators/notification.validator'
import { listNotifications } from '~~/server/utils/notifications'
import { requireCompleteUser } from '~~/server/utils/auth'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * List the current user's notifications, newest first, with load-more
 * pagination. Requires a completed account (guests have no notifications).
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireCompleteUser(event, 'user')
    const query = listNotificationsSchema.parse(getQuery(event))

    const data = await listNotifications(user.id, query)
    // The next cursor is the last row's keyset pair. We include the id because
    // several notifications can share the same createdAt when inserted in one
    // bulk emit; createdAt alone can repeat or skip rows.
    const lastItem = data[data.length - 1]
    const nextCursor = data.length === query.limit && lastItem
      ? `${lastItem.createdAt}|${lastItem.id}`
      : null

    return { success: true, data, nextCursor }
  }
  catch (error) {
    return toH3Error(error)
  }
})
