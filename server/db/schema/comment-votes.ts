import { pgTable, uuid, smallint, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { comments } from './comments'
import { users } from './users'

/**
 * One vote per user per comment.
 *
 * Voting is togglable: up -> none -> down. "None" is represented by the ABSENCE
 * of a row (we delete it), so this table only ever holds active +1/-1 votes.
 * The unique (commentId, userId) index enforces the "one vote" rule at the DB
 * level, and lets us upsert on conflict.
 *
 * The aggregate tallies live denormalized on `comments` (upvotes/downvotes/
 * score); this table is the source of truth used to recompute them and to tell
 * the current user how THEY voted (to highlight their arrow).
 */
export const commentVotes = pgTable('comment_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  commentId: uuid('comment_id')
    .notNull()
    .references(() => comments.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // +1 = upvote, -1 = downvote. There is no 0: clearing a vote deletes the row.
  value: smallint('value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
}, table => [
  // Enforces one vote per user per comment and powers the toggle upsert.
  uniqueIndex('comment_votes_comment_user_idx').on(table.commentId, table.userId),
])
