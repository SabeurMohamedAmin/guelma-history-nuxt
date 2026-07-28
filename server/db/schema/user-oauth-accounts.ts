import { pgTable, serial, integer, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { users } from './users'

/**
 * Links a `users` row to an external identity provider (Facebook for now).
 *
 * Why a separate table instead of columns on `users`: one account can be
 * reached through several providers (e.g. a form account that later links
 * Facebook). A join table lets us add providers without a schema migration and
 * keeps login identity (`users`) clean.
 *
 * `(provider, providerUserId)` is unique, so a given Facebook account maps to
 * exactly one local user. Rows cascade-delete with the user.
 */
export const PROVIDERS = ['facebook'] as const

export const userOauthAccounts = pgTable('user_oauth_accounts', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: text('provider', { enum: PROVIDERS }).notNull(),
  // The provider's own stable identifier for the user (e.g. Facebook user id).
  providerUserId: text('provider_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
    .notNull()
    .$defaultFn(() => new Date()),
}, t => [
  // One external identity maps to at most one local account.
  unique('user_oauth_accounts_provider_user_unique').on(t.provider, t.providerUserId),
])
