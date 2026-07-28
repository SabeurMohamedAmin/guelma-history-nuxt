import { refreshUserSession, requireAdmin } from '~~/server/utils/auth'
import { changeAdminPassword } from '~~/server/utils/adminProfile'

/**
 * PATCH /api/admin/profile/password
 * Change the password after verifying the current one.
 */
export default defineEventHandler(async (event) => {
  const { id } = await requireAdmin(event)
  const { currentPassword, newPassword } = await readBody<{
    currentPassword?: string
    newPassword?: string
  }>(event)

  if (!currentPassword || !newPassword) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Current and new passwords are required.',
    })
  }

  await changeAdminPassword(id, currentPassword, newPassword)

  // Re-issue this session so the acting user stays logged in, while every
  // other previously issued session is invalidated by the staleness check.
  await refreshUserSession(event, id)

  return { message: 'Password updated.' }
})
