import { userRegisterSchema } from '~~/server/validators/user.validator'
import { registerUser, AccountConflictError } from '~~/server/utils/user-account'

/**
 * POST /api/auth/user/register
 * Create a password (form) user account and email a verification link.
 *
 * Roles created here are always 'user'. The account is created unverified and
 * no session is started — the user logs in after clicking the verify link. A
 * 409 is returned when the email or username is already taken (public
 * registration intentionally reveals a clash so the user can pick another).
 */
export default defineEventHandler(async (event) => {
  const input = userRegisterSchema.parse(await readBody(event))

  const { public: { siteUrl } } = useRuntimeConfig()
  const verifyUrlBase = `${siteUrl}/verify-email`

  try {
    await registerUser({ ...input, verifyUrlBase })
  }
  catch (error) {
    if (error instanceof AccountConflictError) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: error.message,
      })
    }
    throw error
  }

  return {
    message: 'Account created. Check your inbox to verify your email before logging in.',
  }
})
