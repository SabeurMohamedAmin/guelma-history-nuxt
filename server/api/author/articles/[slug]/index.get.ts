import { articleService } from '~~/server/services/article.service'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/author/articles/:slug
 * Read one of the author's own articles (used to populate the edit form).
 *
 * Ownership-gated: an author may only read their own article here; an admin may
 * read any. Use the public article endpoints for general reading.
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
    return await articleService.getArticleBySlug(slug)
  }
  catch (error) {
    toH3Error(error)
  }
})
