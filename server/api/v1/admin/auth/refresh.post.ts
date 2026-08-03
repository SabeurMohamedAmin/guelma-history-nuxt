import { mobileAuthService } from '~~/server/services/mobile-auth.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'

/** Rotate a Flutter refresh token. Every refresh token is single-use. */
export default defineVersionedApiHandler(async (event) => {
  return success(await mobileAuthService.refresh(await readBody(event)))
})
