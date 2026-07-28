import { asc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { authors, articles } from '~~/server/db/schema'

/**
 * GET /api/admin/authors/by-slug/[slug]
 *
 * Single author addressed by slug, enriched with article counts so the admin
 * edit page can render the same shape as the list table.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.trim()
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Invalid author slug' })
  }

  const articleCount = db
    .select({
      authorId: articles.authorId,
      total: sql <number>`count(*)`.as('total'),
      published: sql <number>`count(*) filter (where ${isNotNull(articles.publishedAt)})`.as('published'),
    })
    .from(articles)
    .groupBy(articles.authorId)
    .as('article_count')

  const [row] = await db
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
    .where(eq(authors.slug, slug))
    .orderBy(asc(authors.nameFr))
    .limit(1)

  if (!row) {
    throw createError({ statusCode: 404, message: 'Author not found' })
  }

  return {
    ...row,
    articleCount: Number(row.articleCount),
    publishedCount: Number(row.publishedCount),
  }
})
