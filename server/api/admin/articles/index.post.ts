import { articleService } from '~~/server/services/article.service'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * POST /api/admin/articles
 * Create a new article.
 */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  try {
    const body = await readBody(event)
    return await articleService.create(body, admin.id)
  }
  catch (error) {
    toH3Error(error)
  }
})
