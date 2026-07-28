import { authenticateAuthor } from '~~/server/utils/auth'

/**
 * POST /api/auth/author/login
 * Validate author credentials (username OR email) and start a session.
 *
 * Separate from the admin flow: this endpoint only authenticates accounts whose
 * role is exactly author.
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

  const author = await authenticateAuthor(identifier, password)
  if (!author) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Invalid credentials.',
    })
  }

  await setUserSession(event, {
    user: author,
    loggedInAt: new Date().toISOString(),
  })
  return author
})
