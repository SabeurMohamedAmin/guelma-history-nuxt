import { resetPasswordWithToken } from '~~/server/utils/passwordReset'
import { resetPasswordSchema } from '~~/server/validators/admin-auth.validator'

/**
 * POST /api/auth/reset-password
 * Sets a new password using a valid reset token.
 */
export default defineEventHandler(async (event) => {
  const { token, password } = resetPasswordSchema.parse(await readBody(event))
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
