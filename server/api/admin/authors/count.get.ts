import { count } from 'drizzle-orm'
import { db } from '~~/server/db'
import { authors } from '~~/server/db/schema'

/**
 * GET /api/admin/authors/count
 * Total author count for the dashboard.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const [row] = await db.select({ count: count() }).from(authors)
  return { total: row?.count ?? 0 }
})
