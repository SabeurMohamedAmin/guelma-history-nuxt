import { commentReportService } from '~~/server/services/comment-report.service'
import { requireAdmin } from '~~/server/utils/auth'
import { toH3Error } from '~~/server/utils/handleError'

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event)
    return { success: true, data: await commentReportService.findOpen() }
  }
  catch (error) {
    return toH3Error(error)
  }
})
