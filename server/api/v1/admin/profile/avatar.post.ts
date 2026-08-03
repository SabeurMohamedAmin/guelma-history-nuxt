import { adminProfileService } from '~~/server/services/admin-profile.service'
import { serializeMobileAdminProfile } from '~~/server/serializers/admin-profile.serializer'
import { processAvatarImage } from '~~/server/utils/avatarImage'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  const form = await readMultipartFormData(event)
  const file = form?.find(part => part.name === 'avatar' && part.filename)
  if (!file) throw createError({ statusCode: 400, message: 'No avatar file provided.' })
  const image = await processAvatarImage(file.data)
  const profile = await adminProfileService.updateAvatar(principal.user.id, image.data, image.mimeType)
  return success(serializeMobileAdminProfile(profile))
})
