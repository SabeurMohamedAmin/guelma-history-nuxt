import { adminProfileService } from '~~/server/services/admin-profile.service'
import { serializeMobileAdminProfile } from '~~/server/serializers/admin-profile.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  const body = await readBody<{ displayName?: unknown }>(event)
  const profile = await adminProfileService.updateDisplayName(principal.user.id, body.displayName)
  return success(serializeMobileAdminProfile(profile))
})
