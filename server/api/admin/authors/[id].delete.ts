import { eq, count } from 'drizzle-orm'
import { db } from '~~/server/db'
import { authors, articles } from '~~/server/db/schema'
import { databaseUuidSchema } from '~~/shared/database-uuid'

/**
 * DELETE /api/admin/authors/[id]
 * Deletes an author. Refuses if the author still has articles assigned, so we
 * never orphan content or hit a foreign-key error.
 */
export default defineEventHandler(async (event) => {
  const parsedId = databaseUuidSchema.safeParse(getRouterParam(event, 'id'))
  if (!parsedId.success) {
    throw createError({ statusCode: 400, message: 'Invalid author ID' })
  }
  const id = parsedId.data

  const [articleCount] = await db
    .select({ total: count() })
    .from(articles)
    .where(eq(articles.authorId, id))

  // An aggregate always returns one row, but the array type is still optional.
  const total = articleCount?.total ?? 0

  if (total > 0) {
    throw createError({
      statusCode: 409,
      message: `Cannot delete an author with ${total} article(s). Reassign or remove them first.`,
    })
  }

  const deleted = await db
    .delete(authors)
    .where(eq(authors.id, id))
    .returning({ id: authors.id })

  if (!deleted.length) {
    throw createError({ statusCode: 404, message: 'Author not found' })
  }

  return null
})
