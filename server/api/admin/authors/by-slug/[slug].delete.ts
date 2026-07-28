import { eq, count } from 'drizzle-orm'
import { db } from '~~/server/db'
import { authors, articles } from '~~/server/db/schema'

/**
 * DELETE /api/admin/authors/by-slug/[slug]
 * Deletes an author addressed by slug. Refuses if the author still has
 * articles assigned, so we never orphan content or hit a foreign-key error.
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.trim()
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Invalid author slug' })
  }

  const [author] = await db
    .select({ id: authors.id })
    .from(authors)
    .where(eq(authors.slug, slug))
    .limit(1)

  if (!author) {
    throw createError({ statusCode: 404, message: 'Author not found' })
  }

  const [articleCount] = await db
    .select({ total: count() })
    .from(articles)
    .where(eq(articles.authorId, author.id))

  // An aggregate always returns one row, but the array type is still optional.
  const total = articleCount?.total ?? 0

  if (total > 0) {
    throw createError({
      statusCode: 409,
      message: `Cannot delete an author with ${total} article(s). Reassign or remove them first.`,
    })
  }

  await db.delete(authors).where(eq(authors.id, author.id))

  return null
})
