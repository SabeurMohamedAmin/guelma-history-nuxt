import { resetPasswordWithToken } from '~~/server/utils/passwordReset'

const MIN_PASSWORD_LENGTH = 8

/**
 * POST /api/auth/reset-password
 * Sets a new password using a valid reset token.
 */
export default defineEventHandler(async (event) => {
  const { token, password } = await readBody<{ token?: string, password?: string }>(event)

  if (!token || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Token and new password are required.',
    })
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    })
  }

  const success = await resetPasswordWithToken(token, password)

  if (!success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'This reset link is invalid or has expired.',
    })
  }

  return { message: 'Password updated. You can now log in.' }
})
