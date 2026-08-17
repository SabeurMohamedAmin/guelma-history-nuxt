import { mobileAuthService } from '~~/server/services/mobile-auth.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'
import { databaseUuidSchema } from '~~/shared/database-uuid'

/** Revoke another device session owned by the current administrator. */
export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  const sessionId = databaseUuidSchema.parse(getRouterParam(event, 'id'))
  await mobileAuthService.revokeSession(principal.user.id, sessionId, principal.sessionId)
  return success({ revoked: true })
})
