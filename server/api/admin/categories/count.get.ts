import { count } from 'drizzle-orm'
import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema'

/**
 * GET /api/admin/categories/count
 * Total category count for the dashboard.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const [row] = await db.select({ count: count() }).from(categories)
  return { total: row?.count ?? 0 }
})
