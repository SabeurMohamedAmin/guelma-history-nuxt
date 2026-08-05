import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema/users'
import { createResetToken } from '~~/server/utils/passwordReset'
import { sendPasswordResetEmail } from '~~/server/utils/email/password-reset'
import { forgotPasswordSchema } from '~~/server/validators/admin-auth.validator'

const GENERIC_MESSAGE = 'If that email belongs to an account, a reset link has been sent.'

/**
 * POST /api/auth/forgot-password
 * Sends a reset link if the email belongs to a registered account.
 *
 * Always responds with the same success message regardless of whether the
 * email exists, to prevent account enumeration.
 */
export default defineEventHandler(async (event) => {
  // Keep malformed input indistinguishable from an unknown account while
  // still applying a strict request schema and rejecting extra fields.
  const parsed = forgotPasswordSchema.safeParse(await readBody(event))
  if (!parsed.success) return { message: GENERIC_MESSAGE }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  })

  if (user) {
    const rawToken = await createResetToken(user.id)
    const { public: { siteUrl } } = useRuntimeConfig()
    const resetUrl = `${siteUrl}/admin/reset-password?token=${rawToken}`

    await sendPasswordResetEmail(user.email, resetUrl)
  }

  return { message: GENERIC_MESSAGE }
})
