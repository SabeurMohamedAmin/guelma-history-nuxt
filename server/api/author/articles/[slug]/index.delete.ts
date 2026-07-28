import { articleService } from '~~/server/services/article.service'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * DELETE /api/author/articles/:slug
 * Permanently remove one of the author's own articles.
 *
 * Ownership-gated via requireArticleOwner: an author may only delete articles
 * they created; an admin may delete any.
 */
export default defineEventHandler(async (event) => {
  try {
    const slug = getRouterParam(event, 'slug')

    if (!slug) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid article slug.' })
    }

    const id = await articleService.resolveIdBySlug(slug)
    if (id === null) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: `Article ${slug} not found.` })
    }

    await requireArticleOwner(event, id)

    await articleService.deleteBySlug(slug)
    return null
  }
  catch (error) {
    toH3Error(error)
  }
})
