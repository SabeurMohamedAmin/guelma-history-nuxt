import { authenticateAdmin } from '~~/server/utils/auth'

/**
 * POST /api/auth/login
 * Handle admin login with username or email and password.
 * Validate admin credentials (username OR email) and start a session.
 *
 * Accepts `identifier`, or `username` for backward compatibility; both carry a
 * username or an email.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ identifier?: string, username?: string, password?: string }>(event)
  const identifier = body.identifier ?? body.username
  const password = body.password

  if (!identifier || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Username or email and password are required.',
    })
  }

  const admin = await authenticateAdmin(identifier, password)
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
