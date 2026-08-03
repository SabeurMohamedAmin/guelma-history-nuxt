import { adminDashboardService } from '~~/server/services/admin-dashboard.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** Real admin counts and recent articles; no synthetic analytics. */
export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  return success(await adminDashboardService.getDashboard())
})
