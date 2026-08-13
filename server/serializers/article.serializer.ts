import type { ArticleResponse } from '~~/server/types/article.types'

/** Stable mobile serializer. Dates never leak as driver-specific values. */
export function serializeMobileArticle(article: ArticleResponse) {
  // The actor UUID is internal audit metadata. Mobile clients only need the
  // timestamp to show save status, so do not expose account identifiers.
  const { lastSavedByUserId: _lastSavedByUserId, ...safeArticle } = article

  return {
    ...safeArticle,
    publishedAt: article.publishedAt?.toISOString() ?? null,
    lastSavedAt: article.lastSavedAt?.toISOString() ?? null,
    createdAt: article.createdAt.toISOString(),
    updatedAt: article.updatedAt.toISOString(),
  }
}
