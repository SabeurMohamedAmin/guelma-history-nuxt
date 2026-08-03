import { index, pgTable, text, timestamp, uniqueIndex, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { users } from './users'

/** Revocable, rotating refresh-token sessions for the Flutter admin app. */
export const mobileAdminSessions = pgTable('mobile_admin_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Only a SHA-256 hash is persisted; the raw refresh token exists on the
  // device and in the login/refresh response only.
  tokenHash: text('token_hash').notNull(),
  tokenFamilyId: uuid('token_family_id').notNull(),
  deviceId: text('device_id').notNull(),
  deviceName: text('device_name'),
  platform: text('platform', { enum: ['android', 'ios'] }).notNull(),
  appVersion: text('app_version'),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'date' }),
  replacedBySessionId: uuid('replaced_by_session_id')
    .references((): AnyPgColumn => mobileAdminSessions.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
}, table => [
  uniqueIndex('mobile_admin_sessions_token_hash_idx').on(table.tokenHash),
  index('mobile_admin_sessions_user_idx').on(table.userId),
  index('mobile_admin_sessions_family_idx').on(table.tokenFamilyId),
  index('mobile_admin_sessions_device_idx').on(table.userId, table.deviceId),
  index('mobile_admin_sessions_expiry_idx').on(table.expiresAt),
])
