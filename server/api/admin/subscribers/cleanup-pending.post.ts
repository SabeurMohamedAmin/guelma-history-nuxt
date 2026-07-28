import { cleanupExpiredPendingSubscriptions } from '~~/server/utils/newsletter'

/**
 * POST /api/admin/subscribers/cleanup-pending
 * Deletes pending newsletter subscriptions whose confirmation token has expired.
 *
 * This is admin-only so it can be called manually from an admin action or by a
 * trusted scheduled job. The domain keeps the cleanup rule in one place.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const deleted = await cleanupExpiredPendingSubscriptions()

  return { deleted }
})
