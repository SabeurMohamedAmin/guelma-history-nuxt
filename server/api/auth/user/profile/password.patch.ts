import { requireCompleteUser, refreshUserSession } from '~~/server/utils/auth'
import { changeUserPassword } from '~~/server/utils/userProfile'

/**
 * PATCH /api/auth/user/profile/password
 * Change the password after verifying the current one.
 */
export default defineEventHandler(async (event) => {
  const { id } = await requireCompleteUser(event)
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

  await changeUserPassword(id, currentPassword, newPassword)

  // Re-issue this session so the acting user stays logged in, while every
  // other previously issued session is invalidated by the staleness check.
  await refreshUserSession(event, id)

  return { message: 'Password updated.' }
})
