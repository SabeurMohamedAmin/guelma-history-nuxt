import { adminProfileService } from '~~/server/services/admin-profile.service'
import { serializeMobileAdminProfile } from '~~/server/serializers/admin-profile.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  const body = await readBody<{ email?: string, currentPassword?: string }>(event)
  if (!body.email || !body.currentPassword) throw createError({ statusCode: 400, message: 'Email and current password are required.' })
  const profile = await adminProfileService.changeEmail(principal.user.id, body.email, body.currentPassword)
  return success(serializeMobileAdminProfile(profile))
})
