import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { subscribers } from '~~/server/db/schema'
import { databaseUuidSchema } from '~~/shared/database-uuid'

/**
 * DELETE /api/admin/subscribers/[id]
 * Permanently removes a subscriber (e.g. an unsubscribe request handled by an
 * admin, or a spam address). Returns 404 if the id does not exist.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const idResult = databaseUuidSchema.safeParse(getRouterParam(event, 'id'))
  if (!idResult.success) {
    throw createError({ statusCode: 400, message: 'Invalid subscriber ID' })
  }

  const deleted = await db
    .delete(subscribers)
    .where(eq(subscribers.id, idResult.data))
    .returning({ id: subscribers.id })

  if (!deleted.length) {
    throw createError({ statusCode: 404, message: 'Subscriber not found' })
  }

  return null
})
