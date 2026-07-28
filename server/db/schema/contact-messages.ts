import { pgTable, text, serial, timestamp } from 'drizzle-orm/pg-core'

/**
 * Contact form submissions.
 *
 * A message starts life as `pending` and is only delivered to the site owner
 * once the sender proves they control the email address by clicking the
 * verification link (double opt-in). This stops spoofed / mistyped addresses
 * from reaching the owner's inbox.
 *
 * Only a HASH of the verification token is stored, so a DB leak cannot be used
 * to verify messages. Tokens are single-use (`verifiedAt`) and time-limited
 * (`tokenExpiresAt`).
 */
export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  message: text('message').notNull(),
  attachmentsJson: text('attachments_json'),
  // 'pending' until the email is verified, then 'verified', then 'delivered'.
  status: text('status').notNull().default('pending'),
  tokenHash: text('token_hash').notNull().unique(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  verifiedAt: timestamp('verified_at', { withTimezone: true, mode: 'date' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().$defaultFn(() => new Date()),
})
