import { mobileAuthService } from '~~/server/services/mobile-auth.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'

/** Create one revocable Flutter admin session for this device. */
export default defineVersionedApiHandler(async (event) => {
  return success(await mobileAuthService.login(await readBody(event)))
})
