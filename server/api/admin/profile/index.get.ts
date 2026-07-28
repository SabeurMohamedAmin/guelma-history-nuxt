import { requireAdmin } from '~~/server/utils/auth'
import { getAdminProfile } from '~~/server/utils/adminProfile'

/**
 * GET /api/admin/profile
 * Returns the current admin's full profile plus the session login time.
 */
export default defineEventHandler(async (event) => {
  const sessionUser = await requireAdmin(event)
  const session = await getUserSession(event)

  const profile = await getAdminProfile(sessionUser.id)

  return {
    ...profile,
    loggedInAt: session.loggedInAt ?? null,
  }
})
