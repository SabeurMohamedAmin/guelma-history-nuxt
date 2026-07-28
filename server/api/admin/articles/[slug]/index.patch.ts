import { articleService } from '~~/server/services/article.service'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * PATCH /api/admin/articles/:slug
 * Partial update — only provided fields are changed.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  try {
    const slug = getRouterParam(event, 'slug')

    if (!slug) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid article slug.' })
    }

    const body = await readBody(event)
    return await articleService.updateBySlug(slug, body)
  }
  catch (error) {
    toH3Error(error)
  }
})
