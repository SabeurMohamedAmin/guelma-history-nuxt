import { pgTable, serial, uuid, integer, text, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { articles } from './articles'
import { comments } from './comments'
import { users } from './users'

/**
 * A user's choice to stop receiving notifications for something.
 *
 * One row means "this user does not want notifications for this scope/target".
 * The notifications emitter checks this table as the LAST step, after the rules
 * and de-duplication have produced the final recipients, and drops anyone who
 * has a matching mute.
 *
 * Scopes
 * ------
 *   'all'     : mute every notification for this user. `articleId`/`commentId`
 *               stay null. All-or-nothing for now; muting per type (e.g.
 *               replies but not article comments) can be added later without a
 *               schema change, by introducing new scope values.
 *   'article' : mute one article's thread activity. `articleId` is set.
 *   'comment' : mute one comment thread. `commentId` is set.
 *
 * A user can hold at most one mute per (scope, target) thanks to the unique
 * index, so muting the same thing twice is a no-op instead of a duplicate.
 */
export const notificationMutes = pgTable('notification_mutes', {
  id: serial('id').primaryKey(),
  // The user who muted. Guests have no notifications, so this is required.
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Which kind of mute this is. See the scope notes above.
  scope: text('scope', { enum: ['all', 'article', 'comment'] }).notNull(),
  // Set only when scope = 'article'; null otherwise.
  articleId: integer('article_id').references(() => articles.id, { onDelete: 'cascade' }),
  // Set only when scope = 'comment'; null otherwise.
  commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
}, table => [
  // One mute per user per target; prevents duplicate mutes.
  uniqueIndex('notification_mutes_user_target_idx').on(table.userId, table.scope, table.articleId, table.commentId),
  // Look up all of a user's mutes while emitting notifications.
  index('notification_mutes_user_idx').on(table.userId),
])
