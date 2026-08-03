import { mobileAuthService } from '~~/server/services/mobile-auth.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** Revoke only the Flutter session represented by this bearer token. */
export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  await mobileAuthService.logoutCurrent(principal.user.id, principal.sessionId)
  return success({ loggedOut: true })
})
