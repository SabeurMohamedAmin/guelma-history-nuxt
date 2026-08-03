import { and, desc, eq, isNull, lt, ne } from 'drizzle-orm'
import { db } from '~~/server/db'
import { mobileAdminSessions } from '~~/server/db/schema'

export interface CreateMobileSessionInput {
  userId: string
  tokenHash: string
  tokenFamilyId: string
  deviceId: string
  deviceName?: string | null
  platform: 'android' | 'ios'
  appVersion?: string | null
  expiresAt: Date
}

export interface RotateMobileSessionInput {
  currentTokenHash: string
  nextTokenHash: string
  nextExpiresAt: Date
}

export type RotateMobileSessionResult
  = | { status: 'rotated', session: typeof mobileAdminSessions.$inferSelect }
    | { status: 'invalid' }
    | { status: 'reuse-detected' }

export class MobileAuthSessionRepository {
  async findActiveById(id: string) {
    const session = await db.query.mobileAdminSessions.findFirst({
      where: and(
        eq(mobileAdminSessions.id, id),
        isNull(mobileAdminSessions.revokedAt),
      ),
    })

    return session && session.expiresAt > new Date() ? session : null
  }

  async create(input: CreateMobileSessionInput) {
    const [session] = await db.insert(mobileAdminSessions).values(input).returning()
    return session ?? null
  }

  /**
   * Replaces one refresh token exactly once. The conditional update is the
   * concurrency gate: only one request can claim an active token.
   */
  async rotate(input: RotateMobileSessionInput): Promise<RotateMobileSessionResult> {
    return db.transaction(async (tx) => {
      const current = await tx.query.mobileAdminSessions.findFirst({
        where: eq(mobileAdminSessions.tokenHash, input.currentTokenHash),
      })

      if (!current || current.expiresAt <= new Date()) return { status: 'invalid' }

      if (current.revokedAt || current.replacedBySessionId) {
        await tx.update(mobileAdminSessions)
          .set({ revokedAt: new Date() })
          .where(and(
            eq(mobileAdminSessions.tokenFamilyId, current.tokenFamilyId),
            isNull(mobileAdminSessions.revokedAt),
          ))
        return { status: 'reuse-detected' }
      }

      const [claimed] = await tx.update(mobileAdminSessions)
        .set({ revokedAt: new Date(), lastUsedAt: new Date() })
        .where(and(
          eq(mobileAdminSessions.id, current.id),
          isNull(mobileAdminSessions.revokedAt),
          isNull(mobileAdminSessions.replacedBySessionId),
        ))
        .returning()

      if (!claimed) {
        await tx.update(mobileAdminSessions)
          .set({ revokedAt: new Date() })
          .where(and(
            eq(mobileAdminSessions.tokenFamilyId, current.tokenFamilyId),
            isNull(mobileAdminSessions.revokedAt),
          ))
        return { status: 'reuse-detected' }
      }

      const [next] = await tx.insert(mobileAdminSessions).values({
        userId: current.userId,
        tokenHash: input.nextTokenHash,
        tokenFamilyId: current.tokenFamilyId,
        deviceId: current.deviceId,
        deviceName: current.deviceName,
        platform: current.platform,
        appVersion: current.appVersion,
        expiresAt: input.nextExpiresAt,
      }).returning()

      if (!next) throw new Error('Mobile session rotation did not create a replacement.')

      await tx.update(mobileAdminSessions)
        .set({ replacedBySessionId: next.id })
        .where(eq(mobileAdminSessions.id, current.id))

      return { status: 'rotated', session: next }
    })
  }

  async listActiveForUser(userId: string) {
    return db.query.mobileAdminSessions.findMany({
      where: and(
        eq(mobileAdminSessions.userId, userId),
        isNull(mobileAdminSessions.revokedAt),
      ),
      orderBy: [desc(mobileAdminSessions.lastUsedAt)],
    })
  }

  async revokeByIdForUser(id: string, userId: string): Promise<boolean> {
    const rows = await db.update(mobileAdminSessions)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(mobileAdminSessions.id, id),
        eq(mobileAdminSessions.userId, userId),
        isNull(mobileAdminSessions.revokedAt),
      ))
      .returning({ id: mobileAdminSessions.id })
    return rows.length > 0
  }

  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<number> {
    const conditions = [
      eq(mobileAdminSessions.userId, userId),
      isNull(mobileAdminSessions.revokedAt),
    ]
    if (exceptSessionId) conditions.push(ne(mobileAdminSessions.id, exceptSessionId))

    const rows = await db.update(mobileAdminSessions)
      .set({ revokedAt: new Date() })
      .where(and(...conditions))
      .returning({ id: mobileAdminSessions.id })
    return rows.length
  }

  async revokeFamily(tokenFamilyId: string): Promise<void> {
    await db.update(mobileAdminSessions)
      .set({ revokedAt: new Date() })
      .where(and(
        eq(mobileAdminSessions.tokenFamilyId, tokenFamilyId),
        isNull(mobileAdminSessions.revokedAt),
      ))
  }

  async deleteExpired(before = new Date()): Promise<number> {
    const deleted = await db.delete(mobileAdminSessions)
      .where(lt(mobileAdminSessions.expiresAt, before))
      .returning({ id: mobileAdminSessions.id })
    return deleted.length
  }
}

export const mobileAuthSessionRepository = new MobileAuthSessionRepository()
