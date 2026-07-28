import { desc } from 'drizzle-orm'
import { db } from '~~/server/db'
import { subscribers } from '~~/server/db/schema'

/**
 * GET /api/admin/subscribers
 *
 * Full subscriber list for the admin table. Token hashes are never exposed:
 * we only return the fields the UI needs (id, email, status, dates).
 * Newest first so recent sign-ups are immediately visible.
 */
export default defineEventHandler(async () => {
  const rows = await db
    .select({
      id: subscribers.id,
      email: subscribers.email,
      status: subscribers.status,
      confirmedAt: subscribers.confirmedAt,
      unsubscribedAt: subscribers.unsubscribedAt,
      lastEmailSentAt: subscribers.lastEmailSentAt,
      createdAt: subscribers.createdAt,
    })
    .from(subscribers)
    .orderBy(desc(subscribers.createdAt))

  return rows
})
