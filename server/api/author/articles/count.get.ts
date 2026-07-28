import { articleService } from '~~/server/services/article.service'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/author/articles/count
 * Count of the acting author's own articles (for the author dashboard).
 */
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'author')
  try {
    return { total: await articleService.count(user.id) }
  }
  catch (error) {
    toH3Error(error)
  }
})
