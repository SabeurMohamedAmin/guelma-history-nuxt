import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const mobileUploadIdempotency = pgTable('mobile_upload_idempotency', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  idempotencyKey: text('idempotency_key').notNull(),
  requestHash: text('request_hash').notNull(),
  responseJson: text('response_json'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
}, table => [
  uniqueIndex('mobile_upload_idempotency_user_key_unique').on(table.userId, table.idempotencyKey),
  index('mobile_upload_idempotency_expiry_idx').on(table.expiresAt),
])
