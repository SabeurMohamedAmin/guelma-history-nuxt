import { asc } from 'drizzle-orm'
import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema'

/**
 * GET /api/admin/categories
 * Returns full categories list for admin CRUD table/forms.
 */
export default defineEventHandler(async () => {
  return db.query.categories.findMany({
    orderBy: [asc(categories.nameFr), asc(categories.nameAr)],
  })
})
