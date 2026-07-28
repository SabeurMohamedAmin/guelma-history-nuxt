import { articleService } from '~~/server/services/article.service'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * DELETE /api/admin/articles/:slug
 * Permanently remove an article identified by its slug.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  try {
    const slug = getRouterParam(event, 'slug')

    if (!slug) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid article slug.' })
    }

    await articleService.deleteBySlug(slug)
    return null
  }
  catch (error) {
    toH3Error(error)
  }
})
