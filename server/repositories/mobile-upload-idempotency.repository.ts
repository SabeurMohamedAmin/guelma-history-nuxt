import { and, eq, lt } from 'drizzle-orm'
import { db } from '~~/server/db'
import { mobileUploadIdempotency } from '~~/server/db/schema'

export class MobileUploadIdempotencyRepository {
  find(userId: string, key: string) {
    return db.query.mobileUploadIdempotency.findFirst({
      where: and(eq(mobileUploadIdempotency.userId, userId), eq(mobileUploadIdempotency.idempotencyKey, key)),
    })
  }

  async claim(userId: string, key: string, requestHash: string): Promise<boolean> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const rows = await db.insert(mobileUploadIdempotency).values({ userId, idempotencyKey: key, requestHash, expiresAt })
      .onConflictDoNothing().returning({ id: mobileUploadIdempotency.id })
    return rows.length > 0
  }

  complete(userId: string, key: string, response: unknown) {
    return db.update(mobileUploadIdempotency).set({ responseJson: JSON.stringify(response) })
      .where(and(eq(mobileUploadIdempotency.userId, userId), eq(mobileUploadIdempotency.idempotencyKey, key)))
  }

  remove(userId: string, key: string) {
    return db.delete(mobileUploadIdempotency)
      .where(and(eq(mobileUploadIdempotency.userId, userId), eq(mobileUploadIdempotency.idempotencyKey, key)))
  }

  cleanup() {
    return db.delete(mobileUploadIdempotency).where(lt(mobileUploadIdempotency.expiresAt, new Date()))
  }
}

export const mobileUploadIdempotencyRepository = new MobileUploadIdempotencyRepository()
