import { and, desc, eq, isNotNull, sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { authors } from '~~/server/db/schema/authors'
import { articles } from '~~/server/db/schema/articles'
import { categories } from '~~/server/db/schema/categories'
import { validateAuthorSlug, validatePagination } from '~~/server/validators/author.validator'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/authors/:slug/articles
 *
 * Lists ONLY the published articles written under this author's byline
 * (`articles.authorId`), newest first, paginated. Draft articles
 * (`publishedAt IS NULL`) are always excluded so they never leak publicly.
 *
 * Query params:
 *   - page:  1-based page number (default 1)
 *   - limit: items per page (default 12, max 50)
 *
 * Only card-safe fields are returned — enough to render an ArticleCard.
 */
export default defineEventHandler(async (event) => {
  try {
    const slug = validateAuthorSlug(getRouterParam(event, 'slug'))
    const { page, limit } = validatePagination(getQuery(event))

    const author = await db.query.authors.findFirst({
      where: eq(authors.slug, slug),
    })

    if (!author) {
      throw createError({ statusCode: 404, statusMessage: 'Author not found' })
    }

    // Published articles for this byline only.
    const where = and(
      eq(articles.authorId, author.id),
      isNotNull(articles.publishedAt),
    )

    // `.select()` is typed as an array, so read the single row defensively.
    const [totalRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(articles)
      .where(where)
    const total = totalRow?.total ?? 0

    const rows = await db
      .select({
        id: articles.id,
        titleAr: articles.titleAr,
        titleFr: articles.titleFr,
        slug: articles.slug,
        excerptAr: articles.excerptAr,
        excerptFr: articles.excerptFr,
        coverImage: articles.coverImage,
        publishedAt: articles.publishedAt,
        readingTime: articles.readingTime,
        commentCount: articles.commentCount,
        categoryNameAr: categories.nameAr,
        categoryNameFr: categories.nameFr,
      })
      .from(articles)
      .leftJoin(categories, eq(articles.categoryId, categories.id))
      .where(where)
      .orderBy(desc(articles.publishedAt))
      .limit(limit)
      .offset((page - 1) * limit)

    return {
      success: true,
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    }
  }
  catch (error) {
    return toH3Error(error)
  }
})
