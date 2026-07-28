import { articleService } from '~~/server/services/article.service'
import { validateArticlesQuery } from '~~/server/validators/article.validator'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/admin/articles
 * Paginated, filterable article listing for the admin dashboard.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  try {
    const params = validateArticlesQuery(getQuery(event))
    return await articleService.getAll(params)
  }
  catch (error) {
    toH3Error(error)
  }
})
