import { z } from 'zod'
import { mobileAuthService } from '~~/server/services/mobile-auth.service'
import { requireAdmin } from '~~/server/utils/auth'

/** Revoke an owned Flutter session from the cookie-authenticated web admin. */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  const sessionId = z.uuid().parse(getRouterParam(event, 'id'))

  await mobileAuthService.revokeSession(admin.id, sessionId, '')
  return { revoked: true }
})
