import { adminProfileService } from '~~/server/services/admin-profile.service'
import { requireAdmin, refreshUserSession } from '~~/server/utils/auth'

/**
 * PATCH /api/admin/profile/email
 * Change the login email after re-authentication, then refresh the session.
 */
export default defineEventHandler(async (event) => {
  const { id } = await requireAdmin(event)
  const { email, currentPassword } = await readBody<{
    email?: string
    currentPassword?: string
  }>(event)

  if (!email || !currentPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Email and current password are required.',
    })
  }

  const profile = await adminProfileService.changeEmail(id, email, currentPassword)
  await refreshUserSession(event, id)

  return profile
})
