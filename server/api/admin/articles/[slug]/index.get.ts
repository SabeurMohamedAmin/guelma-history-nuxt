import { articleService } from '~~/server/services/article.service'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/admin/articles/:slug
 * Fetch a single article by its unique slug.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  try {
    const slug = getRouterParam(event, 'slug')

    if (!slug) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid article slug.' })
    }

    // getArticleBySlug throws a 404 when the article does not exist.
    return await articleService.getArticleBySlug(slug)
  }
  catch (error) {
    toH3Error(error)
  }
})
