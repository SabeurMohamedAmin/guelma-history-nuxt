import { and, eq, ne } from 'drizzle-orm'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema'

export class AdminProfileRepository {
  findById(id: string) {
    return db.query.users.findFirst({ where: eq(users.id, id) })
  }

  async emailExists(email: string, excludeId: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: and(eq(users.email, email), ne(users.id, excludeId)),
      columns: { id: true },
    })
    return Boolean(user)
  }

  async updateDisplayName(id: string, displayName: string): Promise<void> {
    await db.update(users).set({ displayName }).where(eq(users.id, id))
  }

  async updateEmail(id: string, email: string): Promise<void> {
    await db.update(users).set({ email }).where(eq(users.id, id))
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await db.update(users).set({
      passwordHash,
      passwordChangedAt: new Date(),
    }).where(eq(users.id, id))
  }

  async updateAvatar(id: string, data: Buffer, mimeType: string): Promise<void> {
    await db.update(users).set({
      avatar: null,
      avatarData: data,
      avatarMimeType: mimeType,
      avatarUpdatedAt: new Date(),
    }).where(eq(users.id, id))
  }
}

export const adminProfileRepository = new AdminProfileRepository()
