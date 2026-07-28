import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema/users'
import { verifyEmailToken } from '~~/server/utils/emailVerification'
import { toSessionUser } from '~~/server/utils/auth'

const schema = z.object({ token: z.string().trim().min(1, 'Token is required') })

/**
 * POST /api/auth/user/verify-email
 * Consume a verification token, mark the email verified and start a session.
 *
 * Invalid/expired tokens get a generic 400 (no detail about why) so the link
 * cannot be probed.
 */
export default defineEventHandler(async (event) => {
  const { token } = schema.parse(await readBody(event))

  const userId = await verifyEmailToken(token)
  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'This verification link is invalid or has expired.',
    })
  }

  const account = await db.query.users.findFirst({ where: eq(users.id, userId) })
  if (!account) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Account not found.' })
  }

  const user = toSessionUser(account)
  await setUserSession(event, { user, loggedInAt: new Date().toISOString() })

  return user
})
