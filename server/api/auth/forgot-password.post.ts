import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema/users'
import { createResetToken } from '~~/server/utils/passwordReset'
import { sendPasswordResetEmail } from '~~/server/utils/email/password-reset'

const emailSchema = z.string().trim().toLowerCase().email().max(254)

const GENERIC_MESSAGE = 'If that email belongs to an account, a reset link has been sent.'

/**
 * POST /api/auth/forgot-password
 * Sends a reset link if the email belongs to a registered account.
 *
 * Always responds with the same success message regardless of whether the
 * email exists, to prevent account enumeration.
 */
export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email?: string }>(event)

  // Reject malformed emails, but with the same generic response as a
  // non-existent account so we never reveal which emails are registered.
  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) {
    return { message: GENERIC_MESSAGE }
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data),
  })

  if (user) {
    const rawToken = await createResetToken(user.id)
    const { public: { siteUrl } } = useRuntimeConfig()
    const resetUrl = `${siteUrl}/admin/reset-password?token=${rawToken}`

    await sendPasswordResetEmail(user.email, resetUrl)
  }

  return { message: GENERIC_MESSAGE }
})
