import { and, desc, eq, gte, ilike, lte, or, sql, type SQL } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articles } from '~~/server/db/schema/articles'
import { categories } from '~~/server/db/schema/categories'
import { authors } from '~~/server/db/schema/authors'
import type { ArticleListItem } from '~~/shared/types/article'
import type { SearchParams, SearchResponse } from '~~/shared/types/search'

/**
 * Columns returned for each search hit. Defined once so the SELECT and
 * the ArticleListItem type stay in sync.
 */
const articleListColumns = {
  id: articles.id,
  titleAr: articles.titleAr,
  titleFr: articles.titleFr,
  slug: articles.slug,
  excerptAr: articles.excerptAr,
  excerptFr: articles.excerptFr,
  coverImage: articles.coverImage,
  coverImageVariants: articles.coverImageVariants,
  homePosition: articles.homePosition,
  publishedAt: articles.publishedAt,
  readingTime: articles.readingTime,
  viewCount: articles.viewCount,
  commentCount: articles.commentCount,
  categorySlug: categories.slug,
  categoryNameAr: categories.nameAr,
  categoryNameFr: categories.nameFr,
  authorNameAr: authors.nameAr,
  authorNameFr: authors.nameFr,
}

/**
 * Build the list of WHERE conditions from the search params.
 * Each concern (text match, category filter) is an isolated, optional clause,
 * which keeps the function easy to extend (e.g. add a date range later).
 */
function buildConditions(params: SearchParams): SQL[] {
  const conditions: SQL[] = []

  const term = params.q.trim()
  if (term) {
    const pattern = `%${term}%`
    const textMatch = or(
      ilike(articles.titleAr, pattern),
      ilike(articles.titleFr, pattern),
      ilike(articles.bodyAr, pattern),
      ilike(articles.bodyFr, pattern),
      ilike(authors.nameAr, pattern),
      ilike(authors.nameFr, pattern),
    )
    if (textMatch) conditions.push(textMatch)
  }

  if (params.category) {
    conditions.push(eq(categories.slug, params.category))
  }

  // Inclusive publish-date range. `dateTo` extends to end-of-day so a single
  // calendar day passed as both bounds still matches that whole day.
  if (params.dateFrom) {
    conditions.push(gte(articles.publishedAt, new Date(`${params.dateFrom}T00:00:00.000Z`)))
  }

  if (params.dateTo) {
    conditions.push(lte(articles.publishedAt, new Date(`${params.dateTo}T23:59:59.999Z`)))
  }

  return conditions
}

/**
 * Search articles by title, body, and/or category.
 * Returns a paginated, ordered list plus the total match count.
 */
export async function searchArticles(params: SearchParams): Promise<SearchResponse> {
  const conditions = buildConditions(params)
  const whereClause = conditions.length ? and(...conditions) : undefined
  const offset = (params.page - 1) * params.limit

  const rows = await db
    .select(articleListColumns)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(whereClause)
    .orderBy(desc(articles.publishedAt))
    .limit(params.limit)
    .offset(offset)

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(whereClause)

  return {
    // `readingTime` is nullable in the DB but always a number on the client, so
    // it is normalized here rather than cast away. Article IDs remain UUID
    // strings as defined in shared/types/article.ts.
    articles: rows.map((row): ArticleListItem => ({
      ...row,
      readingTime: row.readingTime ?? 0,
    })),
    total: countResult?.count ?? 0,
    query: params.q,
    category: params.category,
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    page: params.page,
    limit: params.limit,
  }
}
