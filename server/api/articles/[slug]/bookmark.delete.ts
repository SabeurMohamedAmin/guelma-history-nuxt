import { articleSlugSchema } from '~~/server/validators/slug'
import { removeBookmark } from '~~/server/utils/bookmarks'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * Remove an article (by its public slug) from the current user's reading list.
 * Auth-gated: 401 when no session. Idempotent: removing something already gone
 * is a no-op.
 */
export default defineEventHandler(async (event) => {
  try {
    const articleSlug = articleSlugSchema.parse(getRouterParam(event, 'slug'))
    const result = await removeBookmark(event, articleSlug)
    return { success: true, data: result }
  }
  catch (error) {
    return toH3Error(error)
  }
})
