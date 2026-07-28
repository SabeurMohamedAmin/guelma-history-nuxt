import { pgTable, text, serial, integer, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

/**
 * Single-use password reset tokens.
 *
 * Only a HASH of the token is stored — the raw token lives only in the email
 * link, so a database leak cannot be used to reset passwords. Rows are
 * consumed (`usedAt`) on success and expire via `expiresAt`.
 */
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  // What the token authorizes. One table backs both the password-reset and the
  // email-verification flows; they share an identical hash/single-use/TTL
  // lifecycle, so a `purpose` discriminator is cleaner than a second table.
  purpose: text('purpose', { enum: ['reset', 'email_verification'] }).notNull().default('reset'),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
})
