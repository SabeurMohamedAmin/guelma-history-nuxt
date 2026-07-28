import { requireCompleteUser, refreshUserSession } from '~~/server/utils/auth'
import { changeUserEmail } from '~~/server/utils/userProfile'

/**
 * PATCH /api/auth/user/profile/email
 * Change the login email after re-authenticating with the current password.
 */
export default defineEventHandler(async (event) => {
  const { id } = await requireCompleteUser(event)
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

  const profile = await changeUserEmail(id, email, currentPassword)
  await refreshUserSession(event, id)

  return profile
})
