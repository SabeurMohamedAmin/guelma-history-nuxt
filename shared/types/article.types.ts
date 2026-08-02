// server/types/article.types.ts
export interface CreateArticleDto {
  titleAr: string
  titleFr: string
  slug?: string
  excerptAr?: string | null
  excerptFr?: string | null
  bodyAr: string
  bodyFr: string
  coverImage?: string | null
  categoryId?: string | null
  authorId?: string | null
  publishedAt?: Date | null
  readingTime?: number
  tagIds?: string[]
}

export type UpdateArticleDto = Partial<CreateArticleDto>

/**
 * NOTICE — mirror of server/types/article.types.ts, which is the canonical
 * contract. Kept in sync on purpose: `categoryId` / `authorId` are not exposed,
 * read `category` / `author` instead.
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
  publishedAt: Date | null
  readingTime: number
  createdAt: Date
  updatedAt: Date
  category?: {
    id: string
    nameAr: string
    nameFr: string
    slug: string
  }
  author?: {
    id: string
    nameAr: string
    nameFr: string
    avatar: string | null
  }
  tags?: {
    id: string
    nameAr: string
    nameFr: string
    slug: string
  }[]
}

export interface ArticlesQueryParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: string
  authorId?: string
  tagId?: string
  status?: 'published' | 'draft'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
