import { adminProfileService } from '~~/server/services/admin-profile.service'
import { serializeMobileAdminProfile } from '~~/server/serializers/admin-profile.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  return success(serializeMobileAdminProfile(await adminProfileService.getProfile(principal.user.id)))
})
