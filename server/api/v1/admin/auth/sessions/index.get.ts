import { mobileAuthService } from '~~/server/services/mobile-auth.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** List safe device metadata. Token hashes are never selected or returned. */
export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  return success(await mobileAuthService.listSessions(principal.user.id, principal.sessionId))
})
