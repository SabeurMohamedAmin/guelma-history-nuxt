import type { H3Event } from 'h3'
import { eq, or, sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema/users'
import { articles } from '~~/server/db/schema/articles'
import { hasRole, type Role } from '~~/shared/auth/roles'
import { DUMMY_PASSWORD_HASH, verifyPasswordHash } from './password'

/**
 * Authentication & authorization domain logic for every role.
 *
 * Keeps all credential/session/ownership rules in one place so HTTP handlers
 * stay thin. Everything returns the session-safe user shape (no password hash,
 * no avatar blob) defined below.
 */

export interface SessionUser {
  id: string
  username: string
  email: string
  displayName: string | null
  hasAvatar: boolean
  avatarUpdatedAt: string | null
  role: Role
  // False while an OAuth signup still needs to choose a username + password.
  // Lets the client show a "finish setup" banner and gate the complete-profile
  // form. Always true for form-registered users and seeded admins/authors.
  profileCompleted: boolean
}

type UserRow = typeof users.$inferSelect

// ---------------------------------------------------------------------------
// Errors
//
// One small factory per failure case. Every guard throws through these instead
// of hand-writing `createError` inline, so status codes and messages stay
// consistent across the whole file and are easy to tweak in one place.
// ---------------------------------------------------------------------------

const unauthorized = (message: string) =>
  createError({ statusCode: 401, statusMessage: 'Unauthorized', message })

const forbidden = (message: string) =>
  createError({ statusCode: 403, statusMessage: 'Forbidden', message })

const conflict = (message: string) =>
  createError({ statusCode: 409, statusMessage: 'Conflict', message })

const notFound = (message: string) =>
  createError({ statusCode: 404, statusMessage: 'Not Found', message })

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/** Map a DB user row to the session-safe user (never exposes the hash/blob). */
export function toSessionUser(user: UserRow): SessionUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName,
    hasAvatar: Boolean(user.avatarData && user.avatarMimeType),
    avatarUpdatedAt: user.avatarUpdatedAt?.toISOString() ?? null,
    role: user.role,
    profileCompleted: user.profileCompleted,
  }
}

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

/** Find an account by username OR email (both case-insensitive). */
function findUserByIdentifier(identifier: string) {
  const normalized = identifier.trim().toLowerCase()
  return db.query.users.findFirst({
    where: or(
      eq(sql`lower(${users.username})`, normalized),
      eq(sql`lower(${users.email})`, normalized),
    ),
  })
}

/** Find an account by id. */
function findUserById(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) })
}

// ---------------------------------------------------------------------------
// Credential checks (login flows)
// ---------------------------------------------------------------------------

/**
 * Shared, timing-safe credential check for every login flow.
 *
 * Looks up an account by username OR email, verifies the password, and gates on
 * an EXACT role match.
 *
 * The exact-role gate keeps the per-role login pages separated: each role signs
 * in only at its own page (an admin at /admin/login, an author at the author
 * page). It is deliberately NOT hierarchy-inherited here.
 *
 * Returns the session-safe user on success, or null on any failure. We never
 * reveal whether the identifier or the password was the wrong one.
 */
export async function authenticate(
  identifier: string,
  password: string,
  requiredRole: Role,
): Promise<SessionUser | null> {
  const user = await findUserByIdentifier(identifier)

  // Always run a hash verification, even for unknown identifiers, so the
  // response time does not leak whether the account exists. The dummy hash
  // never matches, so unknown users still fail.
  const passwordValid = await verifyPasswordHash(
    password,
    user?.passwordHash ?? DUMMY_PASSWORD_HASH,
  )

  if (!user || !passwordValid) return null

  // Exact-role gate: this flow only authenticates accounts of `requiredRole`.
  if (user.role !== requiredRole) return null

  // Email must be verified before any account can authenticate. Checked after
  // the password verify so the timing of the failure path does not reveal
  // whether the credentials were correct but the email merely unverified.
  if (!user.emailVerifiedAt) return null

  return toSessionUser(user)
}

/** Admin login flow: authenticate an admin by username or email. */
export function authenticateAdmin(identifier: string, password: string) {
  return authenticate(identifier, password, 'admin')
}

/** Author login flow: authenticate an author by username or email. */
export function authenticateAuthor(identifier: string, password: string) {
  return authenticate(identifier, password, 'author')
}

/** User login flow: authenticate a user by username or email. */
export function authenticateUser(identifier: string, password: string) {
  return authenticate(identifier, password, 'user')
}

// ---------------------------------------------------------------------------
// Route guards
// ---------------------------------------------------------------------------

/**
 * Guard for server routes: ensure the request is authenticated AND the acting
 * account meets a minimum role in the hierarchy (user < author < admin).
 *
 * Status codes are deliberately split:
 * - 401 Unauthorized : no session, or the account no longer exists.
 * - 403 Forbidden    : authenticated, but the role rank is below `minRole`.
 *
 * Sessions are stateless sealed cookies, so a password change/reset cannot
 * revoke them directly. To compensate we compare the session's `loggedInAt`
 * against the account's `passwordChangedAt`: any session minted before the last
 * password change is treated as stale and rejected with 401.
 *
 * The DB row is re-read on every call so a role change (e.g. demotion) takes
 * effect immediately, not only on the next login.
 */
export async function requireRole(event: H3Event, minRole: Role): Promise<SessionUser> {
  const session = await getUserSession(event)

  // No session at all -> not authenticated.
  if (!session?.user) {
    throw unauthorized('Authentication required.')
  }

  const account = await findUserById(session.user.id)

  // Session points at an account that no longer exists.
  if (!account) {
    await clearUserSession(event)
    throw unauthorized('Authentication required.')
  }

  // Stale session: the password changed after this session was issued.
  if (isSessionStale(session.loggedInAt, account.passwordChangedAt)) {
    await clearUserSession(event)
    throw unauthorized('Session expired. Please log in again.')
  }

  // Admin and author routes must never accept an unfinished account, even if
  // stale cookie data claims a privileged role. The decision uses the current
  // database row and therefore takes effect immediately.
  if (minRole !== 'user' && !account.profileCompleted) {
    await clearUserSession(event)
    throw unauthorized('Authentication required.')
  }

  // Authenticated, but the (current, DB-backed) role is not high enough.
  if (!hasRole(account.role, minRole)) {
    throw forbidden('You do not have permission to perform this action.')
  }

  // Return the up-to-date session-safe user so callers see the current role.
  return toSessionUser(account)
}

/**
 * Convenience guard for admin-only routes. Thin wrapper over `requireRole` so
 * existing callers keep working unchanged.
 */
export function requireAdmin(event: H3Event): Promise<SessionUser> {
  return requireRole(event, 'admin')
}

/**
 * Guard for actions a user may only perform once their profile is complete.
 *
 * An OAuth sign-up has a valid session immediately, but no password and only a
 * placeholder username until it finishes the complete-profile form. Such a
 * half-formed account must not act on protected user routes, so this guard
 * rejects it with 409 and the client can route it back to the form.
 *
 * The complete-profile endpoint itself must NOT use this guard (it would lock
 * the user out of the very step that completes them) — it uses plain
 * `requireRole('user')` instead.
 */
export async function requireCompleteUser(event: H3Event, minRole: Role = 'user'): Promise<SessionUser> {
  const user = await requireRole(event, minRole)

  if (!user.profileCompleted) {
    throw conflict('Finish setting up your account before continuing.')
  }

  return user
}

/**
 * Per-article ownership guard for write actions (edit/delete).
 *
 * Authorization here has two axes:
 * - role  : can you act on articles at all? (handled by requireRole('author'))
 * - owner : is this specific article yours? (handled below)
 *
 * Rules:
 * - Guest / user            -> rejected by requireRole (401 / 403).
 * - Admin                   -> always allowed (full control, ownership-independent).
 * - Author who owns the row -> allowed.
 * - Author, not the owner   -> 403 Forbidden.
 * - Article does not exist  -> 404 Not Found.
 *
 * Ownership is articles.createdByUserId (the creating account), which is
 * deliberately distinct from articles.authorId (the display byline).
 *
 * Returns the acting session-safe user on success so callers can reuse it.
 */
export async function requireArticleOwner(event: H3Event, articleId: string): Promise<SessionUser> {
  // Must at least be an author (admins inherit). Also runs the session/role checks.
  const user = await requireRole(event, 'author')

  // Admins have full control over every article, regardless of ownership.
  if (hasRole(user.role, 'admin')) {
    return user
  }

  const article = await db.query.articles.findFirst({
    where: eq(articles.id, articleId),
    columns: { createdByUserId: true },
  })

  if (!article) {
    throw notFound('Article not found.')
  }

  // Authors may only act on the articles they created.
  if (article.createdByUserId !== user.id) {
    throw forbidden('You can only manage your own articles.')
  }

  return user
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/**
 * A session is stale if the password changed after it was issued. When either
 * timestamp is missing we fail open (treat as valid) to avoid locking out
 * accounts that have never changed their password.
 */
function isSessionStale(loggedInAt: unknown, passwordChangedAt: Date | null): boolean {
  if (!passwordChangedAt) return false
  if (typeof loggedInAt !== 'string') return true

  const issuedAt = new Date(loggedInAt)
  if (Number.isNaN(issuedAt.getTime())) return true

  return issuedAt.getTime() < passwordChangedAt.getTime()
}

/**
 * Re-read the account from the DB and refresh the session user. Re-stamps
 * `loggedInAt` so the refreshed session is considered newer than any
 * `passwordChangedAt`: call this after a self password change to keep the
 * acting user logged in while `requireRole` invalidates all other sessions.
 */
export async function refreshUserSession(event: H3Event, userId: string): Promise<SessionUser> {
  const account = await findUserById(userId)
  if (!account) {
    throw notFound('User not found.')
  }

  const existingSession = await getUserSession(event)
  const user = toSessionUser(account)

  await setUserSession(event, {
    ...existingSession,
    user,
    loggedInAt: new Date().toISOString(),
  })
  return user
}
