import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema'
import { databaseUuidSchema } from '~~/server/validators/database-uuid'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!databaseUuidSchema.safeParse(id).success) {
    throw createError({ statusCode: 400, message: 'Invalid category ID' })
  }

  const deleted = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id })
  if (!deleted.length) {
    throw createError({ statusCode: 404, message: 'Category not found' })
  }

  return null
})
