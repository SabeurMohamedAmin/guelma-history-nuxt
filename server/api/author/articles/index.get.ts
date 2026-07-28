import { articleService } from '~~/server/services/article.service'
import { validateArticlesQuery } from '~~/server/validators/article.validator'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/author/articles
 * List ONLY the articles owned (created) by the acting author — their
 * "My articles" management view.
 *
 * The owner scope comes from the session, never the query string, so an author
 * cannot widen it to other authors' articles.
 */
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'author')
  try {
    const params = validateArticlesQuery(getQuery(event))
    return await articleService.getAllByOwner(user.id, params)
  }
  catch (error) {
    toH3Error(error)
  }
})
