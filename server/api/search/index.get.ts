import { parseSearchParams } from '~~/server/utils/searchParams'
import { searchArticles } from '~~/server/utils/articleSearch'

/**
 * GET /api/search?q=&category=&page=&limit=
 * Full-text article search by title, body, and category.
 */
export default defineEventHandler(async (event) => {
  const params = parseSearchParams(event)
  return searchArticles(params)
})
