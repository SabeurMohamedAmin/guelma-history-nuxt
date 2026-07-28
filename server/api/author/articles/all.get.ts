import { articleService } from '~~/server/services/article.service'
import { validateArticlesQuery } from '~~/server/validators/article.validator'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/author/articles/all
 * List EVERY published article for the author's read-only "All articles" tab.
 *
 * Unlike GET /api/author/articles (owner-scoped, fully editable), this view is
 * unscoped: an author browses the whole site's content like a reader, with no
 * controls over the rows. It is deliberately published-only:
 * - the author has no edit rights here, so drafts would be noise, and
 * - each row links to the public article page, which only exists once
 *   published; listing drafts would produce dead links.
 *
 * `status` is forced to 'published' server-side so it cannot be widened to
 * include drafts via the query string.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, 'author')
  try {
    const params = validateArticlesQuery(getQuery(event))
    return await articleService.getAll({ ...params, status: 'published' })
  }
  catch (error) {
    toH3Error(error)
  }
})
