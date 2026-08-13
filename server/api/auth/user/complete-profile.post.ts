import { completeProfileSchema } from '~~/server/validators/user.validator'
import { requireRole, refreshUserSession } from '~~/server/utils/auth'
import { completeProfile, AccountConflictError } from '~~/server/utils/user-account'
import { createEmailVerificationToken } from '~~/server/utils/emailVerification'
import { sendEmailVerificationEmail } from '~~/server/utils/email/email-verification'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema/users'
import { eq } from 'drizzle-orm'

/**
 * POST /api/auth/user/complete-profile
 * Finish an OAuth sign-up by choosing a username and password.
 *
 * Only an authenticated user whose profile is still incomplete may call this.
 * A user who has already completed their profile is rejected (409) so this
 * cannot be used to silently change an existing username/password — those go
 * through the dedicated profile endpoints.
 *
 * After a successful profile completion the account still needs email
 * verification. We send the verification link, clear the session so the
 * unverified account cannot act on protected routes, and return a flag so
 * the client can show the "check your inbox" state.
 */
export default defineEventHandler(async (event) => {
  const session = await requireRole(event, 'user')
  const result = completeProfileSchema.safeParse(await readBody(event))

  if (!result.success) {
    const errors: Partial<Record<'username' | 'password', string>> = {}

    for (const issue of result.error.issues) {
      const field = issue.path[0]
      if ((field === 'username' || field === 'password') && !errors[field]) {
        errors[field] = issue.message
      }
    }

    setResponseStatus(event, 422, 'Unprocessable Entity')
    return {
      message: 'Please correct the highlighted fields.',
      errors,
    }
  }

  const input = result.data
  const account = await db.query.users.findFirst({
    where: eq(users.id, session.id),
    columns: { profileCompleted: true, emailVerifiedAt: true, email: true },
  })

  if (account?.profileCompleted) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'Your profile is already set up.',
    })
  }

  try {
    await completeProfile(session.id, input)
  }
  catch (error) {
    if (error instanceof AccountConflictError) {
      throw createError({ statusCode: 409, statusMessage: 'Conflict', message: error.message })
    }
    throw error
  }

  // The account is now profile-complete but still unverified (emailVerifiedAt
  // is null for Facebook OAuth accounts). Send the verification link and clear
  // the session so the unverified account cannot reach protected routes.
  // authenticate() already blocks unverified accounts on the next login.
  if (!account?.emailVerifiedAt) {
    const siteUrl = useRuntimeConfig(event).public.siteUrl as string
    const verifyUrlBase = `${siteUrl}/verify-email`
    const rawToken = await createEmailVerificationToken(session.id)
    await sendEmailVerificationEmail(account!.email, `${verifyUrlBase}?token=${rawToken}`)

    // Clear the session: the account must verify before it can act.
    await clearUserSession(event)

    return { verificationEmailSent: true }
  }

  // Already-verified accounts (edge case: a future provider that stamps
  // emailVerifiedAt) get the normal session refresh.
  return refreshUserSession(event, session.id)
})
