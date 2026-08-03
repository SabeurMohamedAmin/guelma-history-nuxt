import { articleService } from '~~/server/services/article.service'
import { serializeMobileArticle } from '~~/server/serializers/article.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'
import { validateArticlesQuery } from '~~/server/validators/article.validator'

/** Paginated bilingual Flutter article list with allowlisted sorting. */
export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const result = await articleService.getAll(validateArticlesQuery(getQuery(event)))

  return {
    data: result.data.map(serializeMobileArticle),
    meta: {
      page: result.pagination.currentPage,
      pageSize: result.pagination.perPage,
      total: result.pagination.total,
      totalPages: result.pagination.lastPage,
      hasNextPage: result.pagination.hasNextPage,
      hasPreviousPage: result.pagination.hasPrevPage,
    },
  }
})
