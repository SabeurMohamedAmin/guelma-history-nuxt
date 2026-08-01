import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { articles } from './articles'
import { comments } from './comments'
import { users } from './users'

/**
 * In-app notifications for article discussions.
 *
 * One row = one notification shown to one user. Rows are created by the
 * notifications domain (`server/utils/notifications.ts`) right after a comment
 * or reply is written, never by random logic inside the comment handlers.
 *
 * Who gets notified is decided by content ownership and discussion
 * involvement, not by role:
 *   - someone comments on an article  -> the article owner is notified
 *   - someone replies to a comment    -> the parent comment owner is notified
 *   - any reply in a thread           -> the article owner is notified too
 * The actor is never notified about their own action, and recipients are
 * de-duplicated, so one event creates at most one row per user.
 *
 * Unread state
 * ------------
 * `readAt` is null while the notification is unread and is stamped with the
 * read time once the user opens it. We use a nullable timestamp (not a boolean)
 * to match how the rest of the schema encodes state: `editedAt`, `deletedAt`,
 * `emailVerifiedAt`. Unread therefore means `readAt IS NULL`.
 *
 * Deep linking
 * ------------
 * `articleId` + `commentId` let the UI link straight to the comment that
 * triggered the notification (the article page reads `?comment=<uuid>`).
 */
export const notifications = pgTable('notifications', {
  // UUID primary key (gen_random_uuid), like comments: a notification id is not
  // a guessable, enumerable counter and cannot be walked from a URL.
  id: uuid('id').primaryKey().defaultRandom(),
  // The user who sees this notification.
  recipientId: uuid('recipient_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // The user whose action caused it (drives "X commented on your article").
  actorId: uuid('actor_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // What happened, so the client can pick the right message:
  //   'article_comment'         : someone commented on the recipient's article.
  //   'comment_reply'           : someone replied to the recipient's comment.
  //   'article_thread_activity' : a reply changed the discussion on the
  //                               recipient's article (they are the owner).
  type: text('type', {
    enum: ['article_comment', 'comment_reply', 'article_thread_activity'],
  }).notNull(),
  // Deep-link target: the article the discussion belongs to.
  articleId: uuid('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' }),
  // The comment that triggered this notification, for the `?comment=` deep link.
  commentId: uuid('comment_id')
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  // Null while unread; set to the read time once the user opens it.
  readAt: timestamp('read_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
}, table => [
  // The notifications list: one user's notifications, newest first.
  index('notifications_recipient_created_idx').on(table.recipientId, table.createdAt),
  // The unread badge count: unread notifications for one user.
  index('notifications_recipient_read_idx').on(table.recipientId, table.readAt),
])
