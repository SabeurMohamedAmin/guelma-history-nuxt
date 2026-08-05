// server/api/articles/index.get.ts
import { articleService } from '~~/server/services/article.service'
import { validateArticlesQuery } from '~~/server/validators/article.validator'
import { toH3Error } from '~~/server/utils/handleError'
import type { ArticlesQueryParams } from '~~/server/types/article.types'

/**
 * GET /api/articles
 * Public, paginated article listing.
 *
 * The status filter is FORCED to 'published' after validation. This route is
 * public, so a client must never be able to list drafts by sending
 * ?status=draft (or by sending no status at all, which used to mean "every
 * article").
 *
 * Admin, author and Flutter listings need drafts and keep them through their
 * own guarded routes: /api/admin/articles, /api/author/articles and
 * /api/v1/admin/articles.
 */
export default defineEventHandler(async (event) => {
  try {
    const validatedQuery = validateArticlesQuery(getQuery(event)) as ArticlesQueryParams

    const publicQuery: ArticlesQueryParams = {
      ...validatedQuery,
      status: 'published',
    }

    const result = await articleService.getAll(publicQuery)

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    }
  }
  catch (error) {
    return toH3Error(error)
  }
})
