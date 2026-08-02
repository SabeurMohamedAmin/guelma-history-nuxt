// shared/types/article.ts

// Database identifiers are UUID strings throughout the API and client.

export interface ImageVariants {
  thumbnail: string
  slider: string
  main: string
  original: string
}

export interface Article {
  id: string
  titleAr: string
  titleFr: string
  slug: string
  bodyAr: string
  bodyFr: string
  coverImage: string | null
  categoryId: string | null
  authorId: string | null
  publishedAt: Date | null
  readingTime: number
  createdAt: Date
  updatedAt: Date
  // Resolved relations
  author?: Author
  category?: Category
  tags?: Tag[]
}

export interface ArticleListItem {
  id: string
  titleAr: string
  titleFr: string
  slug: string
  coverImage: string | null
  coverImageVariants: ImageVariants | null
  homePosition: number | null
  publishedAt: Date | null
  readingTime: number
  viewCount: number
  commentCount: number
  categorySlug: string | null
  categoryNameAr: string | null
  categoryNameFr: string | null
  authorNameAr: string | null
  authorNameFr: string | null
  excerptAr: string | null
  excerptFr: string | null
}

export interface ArticleFilters {
  page?: number
  limit?: number
  category?: string
  q?: string
}

/* ------------------------------------------------------------------ */
/* Public article page: GET /api/articles/:slug                        */
/* ------------------------------------------------------------------ */

/** Trimmed category / tag reference embedded in an article payload. */
export interface ArticleTermRef {
  id: string
  nameAr: string
  nameFr: string
  slug: string
}

/** Byline author as returned with an article (not the full Author row). */
export interface ArticleAuthorRef extends ArticleTermRef {
  avatar?: string | null
}

/** One image / video of the article gallery. */
export interface ArticleMediaItem {
  type: 'image' | 'video' | 'youtube'
  url: string
  publicId?: string | null
  posterUrl?: string | null
  imageVariants?: ImageVariants | null
  captionAr?: string | null
  captionFr?: string | null
}

/**
 * Full article payload used by the public article page. Text fields exist in
 * both languages; the client picks one and falls back to the other.
 */
export interface ArticleDetail {
  id: string
  slug: string
  titleAr: string
  titleFr: string
  bodyAr: string
  bodyFr: string
  excerptAr?: string | null
  excerptFr?: string | null
  coverImage: string | null
  coverImageVariants?: ImageVariants | null
  media?: ArticleMediaItem[] | null
  publishedAt: string | Date | null
  updatedAt?: string | Date | null
  createdAt: string | Date
  readingTime: number
  category?: ArticleTermRef | null
  author?: ArticleAuthorRef | null
  tags?: ArticleTermRef[]
}
