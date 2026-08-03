import { asc, count, desc, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { subscribers } from '~~/server/db/schema'

export type AdminSubscriberStatus = 'active' | 'unsubscribed'

export class SubscriberRepository {
  findAll() {
    return db.select({
      id: subscribers.id,
      email: subscribers.email,
      status: subscribers.status,
      confirmedAt: subscribers.confirmedAt,
      unsubscribedAt: subscribers.unsubscribedAt,
      lastEmailSentAt: subscribers.lastEmailSentAt,
      createdAt: subscribers.createdAt,
    }).from(subscribers).orderBy(desc(subscribers.createdAt))
  }

  async count(): Promise<number> {
    const [row] = await db.select({ total: count() }).from(subscribers)
    return row?.total ?? 0
  }

  findActiveForExport() {
    return db.select({
      email: subscribers.email,
      confirmedAt: subscribers.confirmedAt,
      createdAt: subscribers.createdAt,
    }).from(subscribers)
      .where(eq(subscribers.status, 'active'))
      .orderBy(asc(subscribers.email))
  }

  async updateStatus(id: string, status: AdminSubscriberStatus): Promise<boolean> {
    const now = new Date()
    const rows = await db.update(subscribers).set({
      status,
      unsubscribedAt: status === 'unsubscribed' ? now : null,
      confirmedAt: status === 'active' ? now : undefined,
      updatedAt: now,
    }).where(eq(subscribers.id, id)).returning({ id: subscribers.id })

    return rows.length > 0
  }

  async delete(id: string): Promise<boolean> {
    const rows = await db.delete(subscribers)
      .where(eq(subscribers.id, id))
      .returning({ id: subscribers.id })
    return rows.length > 0
  }
}

export const subscriberRepository = new SubscriberRepository()
