import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { articles } from './articles'
import { users } from './users'

/** Completed and in-flight mobile article saves, retained for 24 hours. */
export const mobileArticleSaveIdempotency = pgTable('mobile_article_save_idempotency', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  articleId: uuid('article_id').notNull().references(() => articles.id, { onDelete: 'cascade' }),
  idempotencyKey: text('idempotency_key').notNull(),
  requestHash: text('request_hash').notNull(),
  responseJson: text('response_json'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
}, table => [
  uniqueIndex('mobile_article_save_user_key_unique').on(table.userId, table.idempotencyKey),
  index('mobile_article_save_expiry_idx').on(table.expiresAt),
  index('mobile_article_save_article_idx').on(table.articleId),
])
