import { mobileAuthService } from '~~/server/services/mobile-auth.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** Revoke every Flutter session for the current administrator. */
export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  const revokedSessions = await mobileAuthService.logoutAll(principal.user.id)
  return success({ loggedOut: true, revokedSessions })
})
