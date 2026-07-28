import { articleSlugSchema } from '~~/server/validators/slug'
import { addBookmark } from '~~/server/utils/bookmarks'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * Save an article (by its public slug) to the current user's reading list.
 * Auth-gated: 401 when no session. Idempotent, so a double-save returns the
 * same `{ bookmarked: true }`.
 */
export default defineEventHandler(async (event) => {
  try {
    const articleSlug = articleSlugSchema.parse(getRouterParam(event, 'slug'))
    const result = await addBookmark(event, articleSlug)
    return { success: true, data: result }
  }
  catch (error) {
    return toH3Error(error)
  }
})
