import { and, eq, lt } from 'drizzle-orm'
import { db } from '~~/server/db'
import { mobileArticleSaveIdempotency } from '~~/server/db/schema'

export class MobileArticleSaveIdempotencyRepository {
  find(userId: string, key: string) {
    return db.query.mobileArticleSaveIdempotency.findFirst({
      where: and(
        eq(mobileArticleSaveIdempotency.userId, userId),
        eq(mobileArticleSaveIdempotency.idempotencyKey, key),
      ),
    })
  }

  async claim(userId: string, articleId: string, key: string, requestHash: string): Promise<boolean> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const rows = await db.insert(mobileArticleSaveIdempotency)
      .values({ userId, articleId, idempotencyKey: key, requestHash, expiresAt })
      .onConflictDoNothing()
      .returning({ id: mobileArticleSaveIdempotency.id })
    return rows.length > 0
  }

  complete(userId: string, key: string, response: unknown) {
    return db.update(mobileArticleSaveIdempotency)
      .set({ responseJson: JSON.stringify(response) })
      .where(and(
        eq(mobileArticleSaveIdempotency.userId, userId),
        eq(mobileArticleSaveIdempotency.idempotencyKey, key),
      ))
  }

  remove(userId: string, key: string) {
    return db.delete(mobileArticleSaveIdempotency).where(and(
      eq(mobileArticleSaveIdempotency.userId, userId),
      eq(mobileArticleSaveIdempotency.idempotencyKey, key),
    ))
  }

  cleanup() {
    return db.delete(mobileArticleSaveIdempotency)
      .where(lt(mobileArticleSaveIdempotency.expiresAt, new Date()))
  }
}

export const mobileArticleSaveIdempotencyRepository = new MobileArticleSaveIdempotencyRepository()
