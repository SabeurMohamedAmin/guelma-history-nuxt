import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { comments } from './comments'
import { users } from './users'

/**
 * A user report ("flag") on a comment, surfaced to admins for review.
 *
 * One flag per user per comment (unique index) so a single user cannot inflate
 * the report count. `resolvedAt` lets an admin mark a report as handled without
 * deleting the history, so the moderation queue can show open vs. resolved.
 */
export const commentFlags = pgTable('comment_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  commentId: uuid('comment_id')
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  // The account that reported the comment. Guests cannot flag.
  reporterId: uuid('reporter_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Optional free-text reason from the reporter (validated/length-capped in the
  // validator). Stored raw; rendered as text in the admin queue, never as HTML.
  reason: text('reason'),
  // Null while the report is open; set when an admin marks it handled.
  resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
}, table => [
  // One report per user per comment; also speeds "has this user flagged?".
  uniqueIndex('comment_flags_reporter_comment_idx').on(table.reporterId, table.commentId),
])
