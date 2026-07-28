import { muteIdSchema } from '~~/server/validators/notification.validator'
import { unmuteTarget } from '~~/server/utils/notifications'
import { requireCompleteUser } from '~~/server/utils/auth'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * Remove a mute by id (unmute). Scoped to the owner inside `unmuteTarget`, so a
 * user can only delete their own mutes.
 */
export default defineEventHandler(async (event) => {
  try {
    const user = await requireCompleteUser(event, 'user')
    const id = muteIdSchema.parse(getRouterParam(event, 'id'))

    await unmuteTarget(user.id, id)
    return { success: true }
  }
  catch (error) {
    return toH3Error(error)
  }
})
