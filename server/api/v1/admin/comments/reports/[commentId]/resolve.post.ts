import { commentReportService } from '~~/server/services/comment-report.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'
import { databaseUuidSchema } from '~~/shared/database-uuid'

/** Resolve every open report for one comment without changing comment state. */
export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const commentId = databaseUuidSchema.parse(getRouterParam(event, 'commentId'))
  return success(await commentReportService.resolve(commentId))
})
