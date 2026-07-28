// server/types/article.types.ts
export interface CreateArticleDto {
  titleAr: string
  titleFr: string
  slug?: string
  excerptAr?: string
  excerptFr?: string
  body: string
  coverImage?: string
  categoryId?: number
  authorId?: number
  publishedAt?: Date
  readingTime?: number
  tagIds?: number[]
}

export type UpdateArticleDto = Partial<CreateArticleDto>

/**
 * NOTICE — mirror of server/types/article.types.ts, which is the canonical
 * contract. Kept in sync on purpose: `categoryId` / `authorId` are not exposed,
 * read `category` / `author` instead.
 */
export interface ArticleResponse {
  id: number
  titleAr: string
  titleFr: string
  slug: string
  excerptAr: string | null
  excerptFr: string | null
  body: string
  coverImage: string | null
  publishedAt: Date | null
  readingTime: number
  createdAt: Date
  updatedAt: Date
  category?: {
    id: number
    nameAr: string
    nameFr: string
    slug: string
  }
  author?: {
    id: number
    nameAr: string
    nameFr: string
    avatar: string | null
  }
  tags?: {
    id: number
    nameAr: string
    nameFr: string
    slug: string
  }[]
}

export interface ArticlesQueryParams {
  page?: number
  limit?: number
  search?: string
  categoryId?: number
  authorId?: number
  tagId?: number
  status?: 'published' | 'draft'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}
