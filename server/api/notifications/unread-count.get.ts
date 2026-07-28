import { countUnread } from '~~/server/utils/notifications'
import { requireCompleteUser } from '~~/server/utils/auth'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * The unread notification count for the bell badge. Requires a completed
 * account. Returns a single number so the client can render the badge cheaply.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireCompleteUser(event, 'user')
    const count = await countUnread(user.id)
    return { success: true, data: { count } }
  }
  catch (error) {
    return toH3Error(error)
  }
})
