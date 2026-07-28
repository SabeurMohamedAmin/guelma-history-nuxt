import { articleService } from '~~/server/services/article.service'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * POST /api/author/articles
 * Create a new article owned by the acting author.
 *
 * Author-scoped counterpart to the admin create endpoint. The acting user is
 * stamped as the owner (createdByUserId) so the per-author ownership checks on
 * edit/delete apply. Admins inherit the author role, so they may use this too.
 */
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'author')
  try {
    const body = await readBody(event)
    return await articleService.create(body, user.id)
  }
  catch (error) {
    toH3Error(error)
  }
})
