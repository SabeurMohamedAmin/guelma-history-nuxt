import { adminProfileService } from '~~/server/services/admin-profile.service'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

export default defineEventHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  const avatar = await adminProfileService.getAvatar(principal.user.id)
  setHeader(event, 'content-type', avatar.mimeType)
  setHeader(event, 'cache-control', 'private, no-store')
  return avatar.data
})
