import { randomBytes } from 'node:crypto'
import { eq, or, sql, and } from 'drizzle-orm'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema/users'
import { userOauthAccounts } from '~~/server/db/schema/user-oauth-accounts'
import type { PROVIDERS } from '~~/server/db/schema/user-oauth-accounts'
import { createPasswordHash } from './password'
import { toSessionUser, type SessionUser } from './auth'
import { createEmailVerificationToken } from './emailVerification'
import { sendEmailVerificationEmail } from './email/email-verification'

/**
 * Return the first row of a query result, throwing if it is empty.
 *
 * Drizzle's `.returning()` (and similar) is typed as an array, so destructuring
 * the first element yields `T | undefined` even when an insert/update is
 * expected to produce exactly one row. This narrows the result to a
 * non-nullable `T` and fails loudly with a clear message if the invariant is
 * ever broken, instead of leaking `undefined` downstream.
 */
function firstOrThrow<T>(rows: T[], message: string): T {
  const row = rows[0]
  if (!row) throw new Error(message)
  return row
}

/**
 * User-account domain logic for the public auth flows (form sign-up and
 * Facebook OAuth). Kept out of the HTTP handlers so the routes stay thin and
 * the rules (uniqueness, linking, profile completion) live in one place.
 *
 * All of these create/return plain `role: 'user'` accounts. Privileged roles
 * (author/admin) are never created here — they are seeded or promoted
 * elsewhere.
 */

type Provider = (typeof PROVIDERS)[number]

/** A normalized profile coming back from an OAuth provider. */
export interface OauthProfile {
  provider: Provider
  providerUserId: string
  /** Required: we never register an OAuth account without an email. */
  email: string
  /**
   * Whether the PROVIDER asserts this email is verified. Only a verified email
   * may auto-link to an existing local account or be stamped as verified on a
   * new account. Providers that do not assert verification (e.g. Facebook)
   * must pass false.
   */
  emailVerified: boolean
  /**
   * Whether to stamp `emailVerifiedAt` on a NEW account at creation time.
   *
   * This is deliberately separate from `emailVerified`: that flag guards
   * auto-linking to an EXISTING local account (an account-takeover vector, so
   * it stays false for Facebook), whereas this flag only records that the
   * provider already owns/verified the address for the brand-new account it is
   * creating. Facebook hands us an account-verified email, so a fresh Facebook
   * account is stamped verified even though we refuse to silently link it to a
   * pre-existing local account. Defaults to following `emailVerified`.
   */
  markEmailVerified?: boolean
  displayName?: string | null
  /** Given name from the provider, stored on new accounts when present. */
  firstName?: string | null
  /** Family name from the provider, stored on new accounts when present. */
  lastName?: string | null
  /**
   * Date of birth as an ISO `YYYY-MM-DD` string (the `date` column format),
   * stored on new accounts when the provider returns it. Null when unknown.
   */
  dateOfBirth?: string | null
}

export class AccountConflictError extends Error {}

/**
 * Raised when an OAuth identity carries an email that already belongs to a
 * local account, but the provider has NOT asserted that email is verified.
 * Auto-linking in that case would let anyone who controls a provider identity
 * with a victim's email take over the victim's account, so we refuse and let
 * the caller route the user through an explicit, authenticated link flow.
 */
export class AccountExistsError extends Error {}

/**
 * Create a password (form) account and send its email-verification link.
 *
 * Throws AccountConflictError if the email or username is already taken. The
 * account is created unverified (emailVerifiedAt null), so the caller must NOT
 * start a session — the user signs in only after verifying. profileCompleted
 * is true because a form account already has a username + password.
 */
export async function registerUser(input: {
  username: string
  email: string
  password: string
  verifyUrlBase: string
}): Promise<void> {
  const existing = await db.query.users.findFirst({
    where: or(eq(users.username, input.username), eq(users.email, input.email)),
    columns: { id: true, username: true },
  })
  if (existing) {
    throw new AccountConflictError('That email or username is already in use.')
  }

  const passwordHash = await createPasswordHash(input.password)

  const created = firstOrThrow(
    await db.insert(users).values({
      username: input.username,
      email: input.email,
      passwordHash,
      role: 'user',
      profileCompleted: true,
      passwordChangedAt: new Date(),
    })
      .returning(),
    'Failed to create user account',
  )

  const rawToken = await createEmailVerificationToken(created.id)
  await sendEmailVerificationEmail(created.email, `${input.verifyUrlBase}?token=${rawToken}`)
}

/**
 * Pure lookup for the OAuth *login* route: find the local user linked to this
 * provider identity. Returns null when no link exists — the login route uses
 * that to redirect an unknown visitor to register instead of silently creating
 * an account.
 */
export async function findOauthUser(
  provider: Provider,
  providerUserId: string,
): Promise<SessionUser | null> {
  const result = await db
    .select({ user: users })
    .from(userOauthAccounts)
    .innerJoin(users, eq(users.id, userOauthAccounts.userId))
    .where(and(
      eq(userOauthAccounts.provider, provider),
      eq(userOauthAccounts.providerUserId, providerUserId),
    ))
    .limit(1)

  const match = result[0]

  return match ? toSessionUser(match.user) : null
}

/**
 * OAuth *register* route entry point. Resolves the provider profile to a local
 * account, creating or linking as needed:
 *
 * - Already linked            -> return that user (idempotent re-register).
 * - Email matches an account  -> link this provider to it, return that user.
 * - Brand new                 -> create an INCOMPLETE user (no password yet,
 *   profileCompleted false) plus the oauth link, so the caller can send them
 *   to the complete-profile form.
 *
 * The caller must guarantee `profile.email` is present (no FB-without-email).
 */
export async function findOrLinkOauthUser(profile: OauthProfile): Promise<SessionUser> {
  const alreadyLinked = await findOauthUser(profile.provider, profile.providerUserId)
  if (alreadyLinked) return alreadyLinked

  const existingByEmail = await db.query.users.findFirst({
    where: eq(users.email, profile.email),
    columns: { id: true },
  })

  if (existingByEmail) {
    // Only auto-link when the provider asserts the email is verified. Linking
    // an unverified provider email to an existing account is an account-
    // takeover vector, so we refuse and let the caller drive an explicit,
    // authenticated link flow (log into the existing account first).
    if (!profile.emailVerified) {
      throw new AccountExistsError('An account with this email already exists.')
    }

    await db.insert(userOauthAccounts).values({
      userId: existingByEmail.id,
      provider: profile.provider,
      providerUserId: profile.providerUserId,
    })
    const user = await db.query.users.findFirst({ where: eq(users.id, existingByEmail.id) })
    return toSessionUser(user!)
  }

  // New account: created without a password and flagged incomplete until the
  // user finishes the profile form. The username is a random, opaque
  // placeholder (NOT derived from the provider id, which would disclose the
  // provider identity and be fully predictable); the user replaces it in
  // completeProfile().
  const placeholderUsername = `user_${randomBytes(12).toString('hex')}`

  // Stamp email-verified when the provider already owns the address for this
  // NEW account (markEmailVerified), falling back to emailVerified. Note this
  // is independent of the auto-link guard above: we can stamp a fresh Facebook
  // account verified while still refusing to silently link an unverified
  // provider email to a pre-existing local account.
  const created = firstOrThrow(
    await db.insert(users).values({
      username: placeholderUsername,
      email: profile.email,
      passwordHash: null,
      role: 'user',
      profileCompleted: false,
      emailVerifiedAt: (profile.markEmailVerified ?? profile.emailVerified) ? new Date() : null,
      displayName: profile.displayName ?? null,
      firstName: profile.firstName ?? null,
      lastName: profile.lastName ?? null,
      dateOfBirth: profile.dateOfBirth ?? null,
    }).returning(),
    'Failed to create OAuth user',
  )

  await db.insert(userOauthAccounts).values({
    userId: created.id,
    provider: profile.provider,
    providerUserId: profile.providerUserId,
  })

  return toSessionUser(created)
}

/**
 * Finish an OAuth sign-up: set the chosen username + password and flip
 * profileCompleted. Throws AccountConflictError if the username is taken by
 * someone else. Stamps passwordChangedAt so the new credential is valid for
 * the staleness check.
 */
export async function completeProfile(
  userId: string,
  input: { username: string, password: string },
): Promise<SessionUser> {
  const clash = await db.query.users.findFirst({
    where: and(eq(users.username, input.username), sql`${users.id} <> ${userId}`),
    columns: { id: true },
  })
  if (clash) {
    throw new AccountConflictError('That username is already taken.')
  }

  const passwordHash = await createPasswordHash(input.password)

  const updated = firstOrThrow(
    await db.update(users).set({
      username: input.username,
      passwordHash,
      profileCompleted: true,
      passwordChangedAt: new Date(),
    }).where(eq(users.id, userId)).returning(),
    'Failed to update user profile',
  )

  return toSessionUser(updated)
}
