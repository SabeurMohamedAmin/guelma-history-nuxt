import { authenticateAdmin } from '~~/server/utils/auth'
import { adminLoginSchema } from '~~/server/validators/admin-auth.validator'

/**
 * POST /api/auth/login
 * Handle admin login with username or email and password.
 * Validate admin credentials (username OR email) and start a session.
 *
 * Accepts `identifier`, or `username` for backward compatibility; both carry a
 * username or an email.
 */
export default defineEventHandler(async (event) => {
  const body = adminLoginSchema.parse(await readBody(event))
  const identifier = body.identifier ?? body.username!

  const admin = await authenticateAdmin(identifier, body.password)
  if (!admin) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid credentials.',
    })
  }

  await setUserSession(event, {
    user: admin,
    loggedInAt: new Date().toISOString(),
  })
  return admin
})
