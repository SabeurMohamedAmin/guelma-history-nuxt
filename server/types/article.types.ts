import type { CreateArticleInput, UpdateArticleInput, ArticlesQueryInput } from '~~/server/validators/article.validator'
import type { ImageVariants } from '~~/shared/types/article'

/**
 * Server-side article types.
 *
 * DTOs are derived from the Zod schemas so they are always in sync with the
 * validation rules — no manual duplication.
 */

export type CreateArticleDto = CreateArticleInput
export type UpdateArticleDto = UpdateArticleInput
export type ArticlesQueryParams = ArticlesQueryInput

/** A single gallery media item attached to an article. */
export interface ArticleMediaResponse {
  id: string
  type: 'image' | 'video' | 'youtube'
  url: string
  publicId: string | null
  resourceType: 'image' | 'video' | null
  posterUrl: string | null
  imageVariants: ImageVariants | null
  captionAr: string | null
  captionFr: string | null
  /**
   * Alternative text for screen readers and search engines.
   *
   * Separate from the caption, which is shown to every reader. Null when the
   * image is decorative or the editor left it empty.
   */
  altAr: string | null
  altFr: string | null
  position: number
}

/**
 * Full article response shape returned by every admin endpoint.
 *
 * NOTICE — there is no flat `categoryId` / `authorId` here: they were removed
 * on purpose. The relation objects are the single source of truth, and each one
 * carries its own `id` and `slug`. If a consumer ever fails with "categoryId
 * does not exist on type ArticleResponse", the fix is `article.category?.id`
 * (or `article.category?.slug` for links and filters), NOT adding the flat
 * field back. Writes are unaffected: POST/PATCH still accept `categoryId` and
 * `authorId` (see server/validators/article.validator.ts).
 */
export interface ArticleResponse {
  id: string
  titleAr: string
  titleFr: string
  slug: string
  excerptAr: string | null
  excerptFr: string | null
  bodyAr: string
  bodyFr: string
  coverImage: string | null
  coverImageVariants: ImageVariants | null
  homePosition: number | null
  publishedAt: Date | null
  readingTime: number
  revision: number
  lastSavedAt: Date | null
  lastSavedByUserId: string | null
  createdAt: Date
  updatedAt: Date
  category: { id: string, nameAr: string, nameFr: string, slug: string } | null
  author: { id: string, nameAr: string, nameFr: string, slug: string, avatar: string | null } | null
  tags: { id: string, nameAr: string, nameFr: string, slug: string }[]
  media: ArticleMediaResponse[]
}

/** One page of rows plus the paging metadata the dashboard tables read. */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    currentPage: number
    perPage: number
    total: number
    lastPage: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }
}

/** Compact article shape for the dashboard "recent articles" list. */
export interface RecentArticleResponse {
  id: string
  slug: string
  /**
   * Collapsed display strings: `titleFr || titleAr` and `nameFr || nameAr`.
   *
   * They are kept because existing clients read them, but a client rendering
   * an Arabic interface must use the bilingual fields below instead: these two
   * show French text in an Arabic list.
   */
  title: string
  category: string
  /**
   * Both languages, exactly as stored.
   *
   * The server never guesses which language a client wants. Each client picks
   * the field matching its own interface language and falls back to the other
   * one when a translation is missing.
   */
  titleAr: string
  titleFr: string
  categoryAr: string | null
  categoryFr: string | null
  publishedAt: string
  status: 'published' | 'draft'
  /**
   * Small cover image for a list row, or null when the article has no cover.
   *
   * Never the full size cover image: see `resolveArticleThumbnail`.
   */
  thumbnailUrl: string | null
}
