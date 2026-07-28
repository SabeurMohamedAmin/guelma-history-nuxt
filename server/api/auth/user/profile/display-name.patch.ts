import { requireCompleteUser, refreshUserSession } from '~~/server/utils/auth'
import { updateUserDisplayName } from '~~/server/utils/userProfile'

/**
 * PATCH /api/auth/user/profile/display-name
 * Update the editable display name, then refresh the session so the navbar
 * avatar/name reflect the change immediately.
 */
export default defineEventHandler(async (event) => {
  const { id } = await requireCompleteUser(event)
  const { displayName } = await readBody<{ displayName?: string }>(event)

  if (typeof displayName !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'displayName is required.' })
  }

  const profile = await updateUserDisplayName(id, displayName)
  await refreshUserSession(event, id)

  return profile
})
