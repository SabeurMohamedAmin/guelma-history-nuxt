// server/api/articles/index.get.ts
import { articleService } from '~~/server/services/article.service'
import { validateArticlesQuery } from '~~/server/validators/article.validator'
import type { ArticlesQueryParams } from '~~/server/types/article.types'

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    const validatedQuery = validateArticlesQuery(query)

    const result = await articleService.getAll(validatedQuery as ArticlesQueryParams)

    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    }
  }
  catch (error) {
    console.error('Error fetching articles:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Invalid request parameters',
    })
  }
})
