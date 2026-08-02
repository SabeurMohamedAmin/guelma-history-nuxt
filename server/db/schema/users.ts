import { pgTable, text, uuid, timestamp, date, boolean, customType } from 'drizzle-orm/pg-core'
import { ROLES, type Role } from '../../../shared/auth/roles'
import { authors } from './authors'

/**
 * The single account table backing the whole role hierarchy.
 *
 * Every authenticated principal (user, author, admin) is one row here. The
 * `role` column is the stored part of the hierarchy; a guest is simply the
 * absence of a row/session and is never stored.
 *
 * This table replaces the former `admins` table (renamed in migration 0008).
 */

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  // Nullable on purpose: a Facebook-OAuth account has no password until the
  // user completes the "finish your profile" form. A null hash represents the
  // real fact "no password set yet" (never a fabricated/temp password, which
  // would silently make the account login-capable with a credential nobody
  // chose). Password-login paths pass DUMMY_PASSWORD_HASH when this is null, so
  // the verify still runs in constant time and always fails.
  passwordHash: text('password_hash'),
  // False while an OAuth signup still needs to pick a username + password.
  // Gates the complete-profile form and any "finish setup" banner. Plain
  // form-registered users are created with this already true.
  profileCompleted: boolean('profile_completed').notNull().default(false),
  // Timestamp the email was verified; null while unverified. Every account
  // (including admins/authors) must be verified before it can authenticate.
  // OAuth sign-ups are stamped immediately (the provider already verified it).
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true, mode: 'date' }),
  // Stored role within the hierarchy: user < author < admin.
  // Existing rows were backfilled to 'admin' by the rename migration.
  role: text('role', { enum: ROLES }).notNull().default('user').$type<Role>(),
  // Editorial byline link. Connects a writing account (admin/author) to its
  // authors row (nameAr/nameFr/slug). Null for plain users and guests, who do
  // not write. Set null if the byline row is deleted (the account survives).
  authorId: uuid('author_id').references(() => authors.id, { onDelete: 'set null' }),
  displayName: text('display_name'),
  firstName: text('first_name'),
  lastName: text('last_name'),
  // Date only, no time/timezone (a birthday is the same calendar day worldwide).
  dateOfBirth: date('date_of_birth', { mode: 'string' }),
  //
  // Deletion strategy: HARD DELETE (chosen over soft delete).
  // Removing an account runs a real `DELETE FROM users`; the row is gone, so
  // there is no `deletedAt` column and auth lookups need no `IS NULL` filter.
  // FK rules handle cleanup: password_reset_tokens cascade-deletes, and any
  // articles byline link via authors is unaffected (authorId only SET NULLs
  // when an authors row is removed).
  // Trade-off vs soft delete: no built-in restore/audit trail. Revisit and add
  // a `deletedAt timestamptz` column (plus a `deletedAt IS NULL` filter on
  // EVERY auth query) only if account recovery or retention is ever required.
  //
  avatar: text('avatar'), // Legacy filename kept for backward-compatible migrations.
  avatarData: bytea('avatar_data'),
  avatarMimeType: text('avatar_mime_type'),
  avatarUpdatedAt: timestamp('avatar_updated_at', { withTimezone: true, mode: 'date' }),
  passwordChangedAt: timestamp('password_changed_at', { withTimezone: true, mode: 'date' }),
})
