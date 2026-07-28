import { userLoginSchema } from '~~/server/validators/user.validator'
import { authenticateUser } from '~~/server/utils/auth'

/**
 * POST /api/auth/user/login
 * Authenticate a user by email OR username and start a session.
 *
 * Uses the shared timing-safe credential check with an exact 'user' role gate,
 * so admins/authors cannot sign in here, and an OAuth-only account with no
 * password yet simply fails like any other bad credential.
 */
export default defineEventHandler(async (event) => {
  const { identifier, password } = userLoginSchema.parse(await readBody(event))

  const user = await authenticateUser(identifier, password)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid credentials.',
    })
  }

  await setUserSession(event, {
    user,
    loggedInAt: new Date().toISOString(),
  })
  return user
})
