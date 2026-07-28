// server/api/articles/[slug].get.ts
import { articleService } from '~~/server/services/article.service'

export default defineEventHandler(async (event) => {
  try {
    const slug = event.context.params?.slug

    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Article slug is required',
      })
    }

    const article = await articleService.getArticleBySlug(slug)

    return {
      success: true,
      data: article,
    }
  }
  catch (error) {
    console.error('Error fetching article:', error)

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: error instanceof Error ? error.message : 'Failed to fetch article',
    })
  }
})
