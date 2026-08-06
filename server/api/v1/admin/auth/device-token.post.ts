import { mobileAuthSessionRepository } from '~~/server/repositories/mobile-auth-session.repository'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'
import { registerDeviceTokenSchema } from '~~/server/validators/mobile-device-token.validator'

/**
 * Register or update the FCM / APNs push notification token bound to the active
 * mobile admin bearer session.
 */
export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  const body = await readBody(event)
  const data = registerDeviceTokenSchema.parse(body)

  const updated = await mobileAuthSessionRepository.updatePushToken(
    principal.sessionId,
    data.pushToken,
    data.provider,
  )

  if (!updated) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Mobile session not found or revoked.',
    })
  }

  return success({ registered: true })
})
