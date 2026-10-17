import { and, asc, count, desc, eq, gte, ilike, isNotNull, lte, or, type SQL } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articles } from '~~/server/db/schema/articles'
import { categories } from '~~/server/db/schema/categories'
import { authors } from '~~/server/db/schema/authors'
import {
  DEFAULT_ARTICLE_PAGE_SIZE,
  MAX_ARTICLE_PAGE_NUMBER,
  MAX_ARTICLE_PAGE_SIZE,
  positiveInteger,
  resolveArticlePagination,
} from '~~/server/utils/articlePagination'
import type { ArticleListItem } from '~~/shared/types/article'

/**
 * GET /api/articles/list
 *
 * Public listing of every published article with a rich, optional filter set.
 * Powers the /articles page and its filter panel.
 *
 * Query params (all optional):
 *   - q:        free-text term matched against title (ar/fr), excerpt and author
 *   - category: category slug to restrict results
 *   - sort:     one of SORT_COLUMNS keys (default: 'recent')
 *   - order:    'asc' | 'desc' (optional; a sensible default per sort is applied)
 *   - from:     ISO date string — only articles published on/after this date
 *   - to:       ISO date string — only articles published on/before this date
 *
 * Returns one bounded page of matching articles and the full filtered count.
 * `page` defaults to 1 and `limit` defaults to 24 (maximum 100).
 */

// Single source of truth for sortable columns. Mirrors the category endpoint
// and app/constants/articleSort.ts — keep the three in sync to add a sort.
const SORT_COLUMNS = {
  title: articles.titleFr,
  recent: articles.publishedAt,
  popular: articles.viewCount,
  commented: articles.commentCount,
  // 'hot' = most viewed; the UI scopes it to a recent date range.
  hot: articles.viewCount,
} as const

type SortKey = keyof typeof SORT_COLUMNS

// Title sorts read best ascending (A->Z); metric/date sorts read best descending.
const DEFAULT_ORDER: Record<SortKey, 'asc' | 'desc'> = {
  title: 'asc',
  recent: 'desc',
  popular: 'desc',
  commented: 'desc',
  hot: 'desc',
}

function resolveSortKey(value: unknown): SortKey {
  return typeof value === 'string' && value in SORT_COLUMNS
    ? (value as SortKey)
    : 'recent'
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const requestedPage = positiveInteger(query.page, 1, MAX_ARTICLE_PAGE_NUMBER)
  const limit = positiveInteger(query.limit, DEFAULT_ARTICLE_PAGE_SIZE, MAX_ARTICLE_PAGE_SIZE)

  const sortKey = resolveSortKey(query.sort)
  const orderDir = query.order === 'asc' || query.order === 'desc'
    ? query.order
    : DEFAULT_ORDER[sortKey]
  const order = orderDir === 'asc' ? asc : desc
  const orderColumn = SORT_COLUMNS[sortKey]

  // Only published articles are public.
  const conditions: SQL[] = [isNotNull(articles.publishedAt)]

  // Free-text search across title (both languages), excerpt and author name.
  const term = toTrimmedString(query.q)
  if (term) {
    const pattern = `%${term}%`
    const textMatch = or(
      ilike(articles.titleAr, pattern),
      ilike(articles.titleFr, pattern),
      ilike(articles.excerptAr, pattern),
      ilike(articles.excerptFr, pattern),
      ilike(authors.nameAr, pattern),
      ilike(authors.nameFr, pattern),
    )
    if (textMatch) conditions.push(textMatch)
  }

  // Filter by category slug.
  const categorySlug = toTrimmedString(query.category)
  if (categorySlug) {
    conditions.push(eq(categories.slug, categorySlug))
  }

  // Optional inclusive publish-date range.
  const from = parseDate(query.from)
  const to = parseDate(query.to)
  if (from) conditions.push(gte(articles.publishedAt, from))
  if (to) conditions.push(lte(articles.publishedAt, to))

  const [countRow] = await db
    .select({ total: count() })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(and(...conditions))

  const total = Number(countRow?.total ?? 0)
  // Clamp out-of-range pages before applying OFFSET, including maliciously
  // large page numbers, so the database never scans an absurd offset.
  const { page, totalPages, offset } = resolveArticlePagination(requestedPage, total, limit)

  const rows = await db
    .select({
      id: articles.id,
      titleAr: articles.titleAr,
      titleFr: articles.titleFr,
      slug: articles.slug,
      coverImage: articles.coverImage,
      coverImageVariants: articles.coverImageVariants,
      homePosition: articles.homePosition,
      publishedAt: articles.publishedAt,
      readingTime: articles.readingTime,
      viewCount: articles.viewCount,
      commentCount: articles.commentCount,
      excerptAr: articles.excerptAr,
      excerptFr: articles.excerptFr,
      categorySlug: categories.slug,
      categoryNameAr: categories.nameAr,
      categoryNameFr: categories.nameFr,
      authorNameAr: authors.nameAr,
      authorNameFr: authors.nameFr,
    })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(and(...conditions))
    .orderBy(order(orderColumn))
    .limit(limit)
    .offset(offset)

  return {
    articles: rows as ArticleListItem[],
    total,
    page,
    limit,
    totalPages,
  }
})
