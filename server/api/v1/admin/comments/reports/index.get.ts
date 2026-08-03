import { commentReportService } from '~~/server/services/comment-report.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** List unresolved report groups using existing web-admin behavior. */
export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  return success(await commentReportService.findOpen())
})
