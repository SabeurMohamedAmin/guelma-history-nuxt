import { adminProfileService } from '~~/server/services/admin-profile.service'
import { requireAdmin } from '~~/server/utils/auth'

/**
 * GET /api/admin/profile
 * Returns the current admin's full profile plus the session login time.
 */
export default defineEventHandler(async (event) => {
  const sessionUser = await requireAdmin(event)
  const session = await getUserSession(event)

  const profile = await adminProfileService.getProfile(sessionUser.id)

  return {
    ...profile,
    loggedInAt: session.loggedInAt ?? null,
  }
})
