import { adminProfileService } from '~~/server/services/admin-profile.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** Password changes intentionally revoke this session and every other device. */
export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  const body = await readBody<{ currentPassword?: string, newPassword?: string }>(event)
  if (!body.currentPassword || !body.newPassword) throw createError({ statusCode: 400, message: 'Current and new passwords are required.' })
  await adminProfileService.changePassword(principal.user.id, body.currentPassword, body.newPassword)
  return success({ passwordUpdated: true, loginRequired: true })
})
