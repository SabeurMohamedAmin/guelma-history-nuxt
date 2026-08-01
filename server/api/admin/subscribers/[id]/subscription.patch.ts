import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/db'
import { subscribers } from '~~/server/db/schema'
import { databaseUuidSchema } from '~~/server/validators/database-uuid'

const updateSubscriberStatusSchema = z.object({
  status: z.enum(['active', 'unsubscribed']),
})

/**
 * PATCH /api/admin/subscribers/[id]/subscription
 *
 * Admin switch for newsletter delivery. Active subscribers receive article
 * emails; unsubscribed subscribers stay in the list but are skipped by the
 * newsletter sender and CSV export.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!databaseUuidSchema.safeParse(id).success) {
    throw createError({ statusCode: 400, message: 'Invalid subscriber ID' })
  }

  const { status } = updateSubscriberStatusSchema.parse(await readBody(event))
  const now = new Date()

  const updated = await db
    .update(subscribers)
    .set({
      status,
      unsubscribedAt: status === 'unsubscribed' ? now : null,
      confirmedAt: status === 'active' ? now : undefined,
      updatedAt: now,
    })
    .where(eq(subscribers.id, id))
    .returning({ id: subscribers.id })

  if (!updated.length) {
    throw createError({ statusCode: 404, message: 'Subscriber not found' })
  }

  return null
})
