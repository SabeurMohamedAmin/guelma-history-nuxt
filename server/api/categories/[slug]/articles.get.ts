import { and, asc, desc, eq, gte, isNotNull, lte, type SQL } from 'drizzle-orm'
import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema/categories'
import { articles } from '~~/server/db/schema/articles'
import { authors } from '~~/server/db/schema/authors'

/**
 * GET /api/categories/:slug/articles
 *
 * Returns the category metadata plus its published articles.
 *
 * Query params:
 *   - sort:  one of SORT_COLUMNS keys (default: 'recent')
 *   - order: 'asc' | 'desc' (optional; sensible default per sort applied below)
 *   - from:  ISO date string — only articles published on/after this date
 *   - to:    ISO date string — only articles published on/before this date
 */

// Single source of truth for sortable columns. To add a new sort, add a column
// here and a matching option in app/constants/articleSort.ts.
const SORT_COLUMNS = {
  title: articles.titleFr,
  recent: articles.publishedAt,
  popular: articles.viewCount,
  commented: articles.commentCount,
  // 'hot' = most viewed; the UI scopes it to the last month via the date range.
  hot: articles.viewCount,
} as const

type SortKey = keyof typeof SORT_COLUMNS

// Title sorts read best ascending (A→Z); metric/date sorts read best descending.
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

// Defensive ceiling on one category response. The category page renders every
// published article of a category and paginates client-side, so the contract
// stays a plain array — but without any LIMIT a single request would grow with
// the whole archive forever. 500 is far above the realistic size of one
// category on this site while bounding the worst-case response cost.
const MAX_CATEGORY_ARTICLES = 500

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Category slug is required' })
  }

  const category = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  })

  if (!category) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  const query = getQuery(event)
  const sortKey = resolveSortKey(query.sort)
  const orderDir = query.order === 'asc' || query.order === 'desc'
    ? query.order
    : DEFAULT_ORDER[sortKey]
  const order = orderDir === 'asc' ? asc : desc
  const orderColumn = SORT_COLUMNS[sortKey]

  // Build the WHERE clause: category + published, plus optional date range.
  const conditions: SQL[] = [
    eq(articles.categoryId, category.id),
    isNotNull(articles.publishedAt),
  ]

  const from = parseDate(query.from)
  const to = parseDate(query.to)
  if (from) conditions.push(gte(articles.publishedAt, from))
  if (to) conditions.push(lte(articles.publishedAt, to))

  const rows = await db
    .select({
      id: articles.id,
      titleAr: articles.titleAr,
      titleFr: articles.titleFr,
      slug: articles.slug,
      coverImage: articles.coverImage,
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
    .limit(MAX_CATEGORY_ARTICLES)

  return {
    category: {
      id: category.id,
      slug: category.slug,
      nameAr: category.nameAr,
      nameFr: category.nameFr,
      descriptionAr: category.descriptionAr,
      descriptionFr: category.descriptionFr,
      icon: category.icon,
      coverImage: category.coverImage,
    },
    articles: rows,
    total: rows.length,
  }
})
