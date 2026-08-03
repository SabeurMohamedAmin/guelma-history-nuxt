import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** Return the current DB-backed Flutter administrator profile. */
export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  return success(principal.user)
})
