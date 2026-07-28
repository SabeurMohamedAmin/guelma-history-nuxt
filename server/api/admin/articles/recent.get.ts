import { articleService } from '~~/server/services/article.service'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/admin/articles/recent
 * Most recent articles for the dashboard list.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  try {
    return await articleService.getRecent(5)
  }
  catch (error) {
    toH3Error(error)
  }
})
