import { pgTable, serial, integer, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { articles } from './articles'
import { users } from './users'

/**
 * A user's personal reading list: one row = "this user saved this article".
 *
 * Mirrors the junction-table precedent in `comment-votes.ts`: a user+entity
 * pair with `onDelete: 'cascade'` on both foreign keys, so deleting either the
 * user or the article cleans up the bookmark automatically (no orphans).
 *
 * Saving is idempotent: the unique (userId, articleId) index enforces "at most
 * one bookmark per user per article" at the database level, which lets writes
 * use `onConflictDoNothing` so a double-tap is a harmless no-op, never a 500.
 */
export const bookmarks = pgTable('bookmarks', {
  id: serial('id').primaryKey(),
  // The user who saved the article. Guests cannot bookmark, so this is required.
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // The saved article.
  articleId: integer('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date()),
}, table => [
  // One bookmark per user per article; powers the idempotent upsert.
  uniqueIndex('bookmarks_user_article_idx').on(table.userId, table.articleId),
  // Fetch a single user's reading list, newest first.
  index('bookmarks_user_idx').on(table.userId),
])
