import { listBookmarks, listBookmarkedArticleSlugs } from '~~/server/utils/bookmarks'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * The current user's reading list. Auth-gated: 401 when no session.
 *
 * Returns both the full saved articles (for the Reading List page) and the bare
 * slug list (for hydrating the save buttons across the app in one request —
 * articles are referenced by their public slug everywhere on the client).
 */
export default defineEventHandler(async (event) => {
  try {
    const [items, slugs] = await Promise.all([
      listBookmarks(event),
      listBookmarkedArticleSlugs(event),
    ])
    return { success: true, data: { items, slugs } }
  }
  catch (error) {
    return toH3Error(error)
  }
})
