import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { authors } from '~~/server/db/schema/authors'
import { validateAuthorSlug } from '~~/server/validators/author.validator'
import { toPublicAuthor, type Locale } from '~~/server/utils/authors/serializeAuthor'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/authors/:slug
 *
 * Returns the localized public profile of an author (byline). Drafts and
 * internal fields never leak here — only name, bio, avatar and slug. Unknown
 * slug → 404.
 *
 * Query params:
 *   - locale: 'ar' | 'fr' (default 'ar') — picks which language to return.
 */
export default defineEventHandler(async (event) => {
  try {
    const slug = validateAuthorSlug(getRouterParam(event, 'slug'))
    const locale: Locale = getQuery(event).locale === 'fr' ? 'fr' : 'ar'

    const author = await db.query.authors.findFirst({
      where: eq(authors.slug, slug),
    })

    if (!author) {
      throw createError({ statusCode: 404, statusMessage: 'Author not found' })
    }

    return {
      success: true,
      data: toPublicAuthor(author, locale),
    }
  }
  catch (error) {
    return toH3Error(error)
  }
})
