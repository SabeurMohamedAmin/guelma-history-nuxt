import { and, asc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { authors } from '~~/server/db/schema/authors'
import { articles } from '~~/server/db/schema/articles'
import { toPublicAuthor, type Locale } from '~~/server/utils/authors/serializeAuthor'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/authors
 *
 * Public list of authors who have at least one published article, with their
 * published article count. Only byline data is exposed (see toPublicAuthor).
 *
 * Query params:
 *   - locale: 'ar' | 'fr' (default 'ar')
 */
export default defineEventHandler(async (event) => {
  try {
    const locale: Locale = getQuery(event).locale === 'fr' ? 'fr' : 'ar'

    // INNER JOIN on published articles: authors with nothing public are left
    // out, so the page never links to an empty profile.
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
        articleCount: sql<number>`count(${articles.id})::int`,
      })
      .from(authors)
      .innerJoin(
        articles,
        and(eq(articles.authorId, authors.id), isNotNull(articles.publishedAt)),
      )
      .groupBy(authors.id)
      .orderBy(asc(locale === 'fr' ? authors.nameFr : authors.nameAr))

    return {
      success: true,
      data: rows.map(row => ({
        ...toPublicAuthor(row, locale),
        articleCount: row.articleCount,
      })),
    }
  }
  catch (error) {
    return toH3Error(error)
  }
})
