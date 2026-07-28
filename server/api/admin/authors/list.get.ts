import { asc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { authors, articles } from '~~/server/db/schema'

/**
 * GET /api/admin/authors/list
 *
 * Full authors list for the admin management table, enriched with how many
 * articles each author has (total + published). Returned as a flat shape the
 * page can render directly.
 *
 * Note: the sibling GET /api/admin/authors returns lightweight { id, name }
 * options for form selects and is intentionally kept separate so existing
 * consumers (e.g. the article form) are not affected.
 */
export default defineEventHandler(async () => {
  const articleCount = db
    .select({
      authorId: articles.authorId,
      total: sql <number>`count(*)`.as('total'),
      published: sql <number>`count(*) filter (where ${isNotNull(articles.publishedAt)})`.as('published'),
    })
    .from(articles)
    .groupBy(articles.authorId)
    .as('article_count')

  const rows = await db
    .select({
      id: authors.id,
      nameAr: authors.nameAr,
      nameFr: authors.nameFr,
      slug: authors.slug,
      bioAr: authors.bioAr,
      bioFr: authors.bioFr,
      avatar: authors.avatar,
      createdAt: authors.createdAt,
      updatedAt: authors.updatedAt,
      articleCount: sql <number>`coalesce(${articleCount.total}, 0)`,
      publishedCount: sql <number>`coalesce(${articleCount.published}, 0)`,
    })
    .from(authors)
    .leftJoin(articleCount, eq(articleCount.authorId, authors.id))
    .orderBy(asc(authors.nameFr), asc(authors.nameAr))

  // Postgres count() comes back as a string via the driver; normalise to number.
  return rows.map(row => ({
    ...row,
    articleCount: Number(row.articleCount),
    publishedCount: Number(row.publishedCount),
  }))
})
