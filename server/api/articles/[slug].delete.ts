import { articleService } from '~~/server/services/article.service'
import { requireArticleOwner } from '~~/server/utils/auth'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * DELETE /api/articles/:slug
 * Permanently remove an article identified by its slug.
 *
 * Authorization mirrors /api/author/articles/:slug through the shared
 * requireArticleOwner() guard: an admin may delete any article, an author only
 * the ones they created, and everyone else is rejected.
 *
 * This route lives under the PUBLIC /api/articles prefix, so no central
 * middleware protects it. The guard below is the only thing between a public
 * slug and a permanent delete — never remove it.
 */
export default defineEventHandler(async (event) => {
  try {
    const slug = getRouterParam(event, 'slug')

    if (!slug) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid article slug.' })
    }

    // Ownership is stored per article id, so the public slug is resolved first.
    const id = await articleService.resolveIdBySlug(slug)
    if (id === null) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: `Article ${slug} not found.` })
    }

    await requireArticleOwner(event, id)

    await articleService.deleteBySlug(slug)
    return { success: true }
  }
  catch (error) {
    return toH3Error(error)
  }
})
