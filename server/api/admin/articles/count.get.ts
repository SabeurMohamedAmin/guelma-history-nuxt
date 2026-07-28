import { articleService } from '~~/server/services/article.service'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/admin/articles/count
 * Total article count for the dashboard.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  try {
    return { total: await articleService.count() }
  }
  catch (error) {
    toH3Error(error)
  }
})
