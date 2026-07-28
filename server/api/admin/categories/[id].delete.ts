import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid category ID' })
  }

  const deleted = await db.delete(categories).where(eq(categories.id, id)).returning({ id: categories.id })
  if (!deleted.length) {
    throw createError({ statusCode: 404, message: 'Category not found' })
  }

  return null
})
