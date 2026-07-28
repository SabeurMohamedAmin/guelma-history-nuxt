import { articleService } from '~~/server/services/article.service'
import { validateArticlesQuery } from '~~/server/validators/article.validator'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/admin/articles/mine
 * List ONLY the articles created by the acting admin (their "My articles"
 * window). Ownership scope comes from the session, never the query string.
 *
 * Counterpart to GET /api/admin/articles, which returns every article for the
 * "All articles" window. The /api/admin middleware already enforces admin
 * access; requireAdmin here also gives us the acting user's id.
 */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  try {
    const params = validateArticlesQuery(getQuery(event))
    return await articleService.getAll(params, admin.id)
  }
  catch (error) {
    toH3Error(error)
  }
})
