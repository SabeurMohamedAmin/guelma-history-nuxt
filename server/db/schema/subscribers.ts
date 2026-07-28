import { index, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

/**
 * Newsletter subscribers.
 *
 * Uses double opt-in: a subscriber starts as `pending` and only becomes `active`
 * after they click the confirmation link emailed to them. This keeps spoofed or
 * mistyped addresses out of the active newsletter list.
 *
 * Token storage
 * -------------
 * Only HASHES of tokens are stored. Raw confirmation/unsubscribe tokens are sent
 * by email and never persisted, so a database leak cannot be used to confirm or
 * unsubscribe addresses directly.
 *
 * Status model
 * ------------
 * `pending`      email submitted but not confirmed yet.
 * `active`       confirmed subscriber who can receive article alerts.
 * `unsubscribed` user opted out; keep the row to prevent accidental re-sends and
 *                allow a later explicit re-subscribe to rotate a fresh token.
 */
export const subscribers = pgTable('subscribers', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  status: text('status', {
    enum: ['pending', 'active', 'unsubscribed'],
  }).notNull().default('pending'),

  // Double opt-in confirmation token. Hash + expiry are set whenever a
  // confirmation email is sent and cleared once the subscription becomes active.
  tokenHash: text('token_hash'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true, mode: 'date' }),
  confirmationSentAt: timestamp('confirmation_sent_at', { withTimezone: true, mode: 'date' }),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true, mode: 'date' }),

  // Single-click unsubscribe support for article alert emails. The raw token is
  // included in emails; this hash is used for lookup.
  unsubscribeTokenHash: text('unsubscribe_token_hash'),
  unsubscribedAt: timestamp('unsubscribed_at', { withTimezone: true, mode: 'date' }),

  // Useful for admin visibility and later throttling/debugging.
  lastEmailSentAt: timestamp('last_email_sent_at', { withTimezone: true, mode: 'date' }),

  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
}, table => [
  // Fast lookup for active recipients when an article is first published.
  index('subscribers_status_idx').on(table.status),
  // Fast lookup for confirmation and unsubscribe links.
  index('subscribers_token_hash_idx').on(table.tokenHash),
  index('subscribers_unsubscribe_token_hash_idx').on(table.unsubscribeTokenHash),
  // Cleanup pending rows whose confirmation token expired.
  index('subscribers_status_token_expires_idx').on(table.status, table.tokenExpiresAt),
])
