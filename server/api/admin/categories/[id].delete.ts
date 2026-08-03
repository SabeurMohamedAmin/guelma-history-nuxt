import { count, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articles, categories } from '~~/server/db/schema'
import { categoryIdSchema } from '~~/server/validators/category.validator'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const result = categoryIdSchema.safeParse(getRouterParam(event, 'id'))
  if (!result.success) {
    throw createError({ statusCode: 400, message: 'Invalid category ID' })
  }
  const id = result.data

  const [[childRow], [articleRow]] = await Promise.all([
    db.select({ total: count() }).from(categories).where(eq(categories.parentId, id)),
    db.select({ total: count() }).from(articles).where(eq(articles.categoryId, id)),
  ])
  const childCount = childRow?.total ?? 0
  const articleCount = articleRow?.total ?? 0

  if (childCount > 0 || articleCount > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: `Cannot delete this category while it has ${childCount} child category(s) and ${articleCount} article(s).`,
    })
  }

  const deleted = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id })
  if (!deleted.length) {
    throw createError({ statusCode: 404, message: 'Category not found' })
  }

  return null
})
