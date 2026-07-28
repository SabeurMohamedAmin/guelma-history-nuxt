import { articleService } from '~~/server/services/article.service'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/author/articles/recent
 * The acting author's most recent own articles (for the author dashboard).
 */
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'author')
  try {
    return await articleService.getRecent(5, user.id)
  }
  catch (error) {
    toH3Error(error)
  }
})
