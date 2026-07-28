import { count } from 'drizzle-orm'
import { db } from '~~/server/db'
import { subscribers } from '~~/server/db/schema'

/**
 * GET /api/admin/subscribers/count
 * Total subscriber count for the dashboard.
 */
export default defineEventHandler(async () => {
  const [row] = await db.select({ count: count() }).from(subscribers)
  return { total: row?.count ?? 0 }
})
