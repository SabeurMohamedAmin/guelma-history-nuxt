import { and, desc, eq, isNotNull, ne, type SQL } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articles } from '~~/server/db/schema/articles'
import { categories } from '~~/server/db/schema/categories'
import { authors } from '~~/server/db/schema/authors'
import type { ArticleListItem } from '~~/shared/types/article'

/**
 * GET /api/articles/related/:slug
 *
 * Returns articles related to the one identified by :slug. Relevance is based
 * on the shared category: we return the most recent published articles from the
 * same category, excluding the current article. If the category does not have
 * enough articles, the list is topped up with the latest published articles so
 * the section always has something to show.
 *
 * Query params:
 *   - limit: max number of related articles to return (default 3, max 12)
 */

const DEFAULT_LIMIT = 3
const MAX_LIMIT = 12

// Columns shared by every related-article query. Matches ArticleListItem so the
// frontend can render the results with the existing ArticleCard component.
const LIST_COLUMNS = {
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
} as const

function parseLimit(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : NaN
  if (Number.isNaN(parsed) || parsed < 1) return DEFAULT_LIMIT
  return Math.min(parsed, MAX_LIMIT)
}

function fetchArticles(conditions: SQL[], limit: number) {
  return db
    .select(LIST_COLUMNS)
    .from(articles)
    .leftJoin(categories, eq(articles.categoryId, categories.id))
    .leftJoin(authors, eq(articles.authorId, authors.id))
    .where(and(...conditions))
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Article slug is required' })
  }

  const current = await db.query.articles.findFirst({
    where: eq(articles.slug, slug),
  })

  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Article not found' })
  }

  const limit = parseLimit(getQuery(event).limit)

  // Primary source: published articles in the same category (if any).
  let rows: ArticleListItem[] = []
  if (current.categoryId !== null) {
    rows = (await fetchArticles(
      [
        eq(articles.categoryId, current.categoryId),
        ne(articles.id, current.id),
        isNotNull(articles.publishedAt),
      ],
      limit,
    )) as ArticleListItem[]
  }

  // Fallback: top up with the latest published articles when the category does
  // not provide enough, so the section is never half-empty.
  if (rows.length < limit) {
    const excludeIds = new Set<number>([current.id, ...rows.map(row => row.id)])
    const fillers = (await fetchArticles(
      [
        ne(articles.id, current.id),
        isNotNull(articles.publishedAt),
      ],
      limit + excludeIds.size,
    )) as ArticleListItem[]

    for (const article of fillers) {
      if (rows.length >= limit) break
      if (excludeIds.has(article.id)) continue
      excludeIds.add(article.id)
      rows.push(article)
    }
  }

  return {
    articles: rows,
    total: rows.length,
  }
})
