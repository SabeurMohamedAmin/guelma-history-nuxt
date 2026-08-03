import type { ArticleResponse } from '~~/server/types/article.types'

/** Stable mobile serializer. Dates never leak as driver-specific values. */
export function serializeMobileArticle(article: ArticleResponse) {
  return {
    ...article,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  }
}
