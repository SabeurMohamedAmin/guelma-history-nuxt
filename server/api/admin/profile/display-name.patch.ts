import { requireAdmin, refreshUserSession } from '~~/server/utils/auth'
import { updateAdminDisplayName } from '~~/server/utils/adminProfile'

/**
 * PATCH /api/admin/profile/display-name
 * Update the editable display name, then refresh the session.
 */
export default defineEventHandler(async (event) => {
  const { id } = await requireAdmin(event)
  const { displayName } = await readBody<{ displayName?: string }>(event)

  if (typeof displayName !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'displayName is required.' })
  }

  const profile = await updateAdminDisplayName(id, displayName)
  await refreshUserSession(event, id)

  return profile
})
