// shared/types/article.ts

// NOTE on ids: `articles.id` is a `serial` (32-bit) primary key, so the API
// serializes it as a JSON NUMBER and it stays a number on the client. Only
// switch these to digit strings if the column is ever widened to INT8.

export interface ImageVariants {
  thumbnail: string
  slider: string
  main: string
  original: string
}

export interface Article {
  id: number
  titleAr: string
  titleFr: string
  slug: string
  bodyAr: string
  bodyFr: string
  coverImage: string | null
  categoryId: number | null
  authorId: number | null
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
  id: number
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
