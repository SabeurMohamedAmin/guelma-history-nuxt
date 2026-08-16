import type { ArticleResponse } from '~~/server/types/article.types'
import { resolveArticleThumbnail } from '~~/server/utils/articleThumbnail'

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
    // List rows must never download the full size cover. Resolved here so
    // the client does not have to know the variant rules, and so rows saved
    // without variants still get a small image.
    thumbnailUrl: resolveArticleThumbnail(
      article.coverImage,
      article.coverImageVariants,
    ),
  }
}
