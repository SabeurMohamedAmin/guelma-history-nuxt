import { listMutes } from '~~/server/utils/notifications'
import { requireCompleteUser } from '~~/server/utils/auth'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * List the current user's notification mutes, so the UI can show what is muted
 * (global, per-article, per-comment). Requires a completed account.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireCompleteUser(event, 'user')
    const data = await listMutes(user.id)
    return { success: true, data }
  }
  catch (error) {
    return toH3Error(error)
  }
})
