import { requireCompleteUser } from '~~/server/utils/auth'
import { getUserProfile } from '~~/server/utils/userProfile'

/**
 * GET /api/auth/user/profile
 * Returns the current user's full profile plus the session login time.
 *
 * Gated with requireCompleteUser: a half-finished OAuth account (no password /
 * placeholder username) is sent through the complete-profile flow instead.
 */
export default defineEventHandler(async (event) => {
  const sessionUser = await requireCompleteUser(event)
  const session = await getUserSession(event)

  const profile = await getUserProfile(sessionUser.id)

  return {
    ...profile,
    loggedInAt: session.loggedInAt ?? null,
  }
})
