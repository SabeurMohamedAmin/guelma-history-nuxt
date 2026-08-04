import { mobileAuthService } from '~~/server/services/mobile-auth.service'
import { requireAdmin } from '~~/server/utils/auth'

/** List active Flutter sessions for the cookie-authenticated web admin. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)

  // The web cookie is not a mobile session, so no returned device is current.
  return mobileAuthService.listSessions(admin.id, '')
})
