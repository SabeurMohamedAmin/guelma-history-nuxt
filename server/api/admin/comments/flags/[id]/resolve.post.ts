import { commentReportService } from '~~/server/services/comment-report.service'
import { requireAdmin } from '~~/server/utils/auth'
import { toH3Error } from '~~/server/utils/handleError'
import { commentIdSchema } from '~~/server/validators/comment.validator'

export default defineEventHandler(async (event) => {
  try {
    await requireAdmin(event)
    const id = commentIdSchema.parse(getRouterParam(event, 'id'))
    return { success: true, ...await commentReportService.resolve(id) }
  }
  catch (error) {
    return toH3Error(error)
  }
})
