import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { users } from '~~/server/db/schema/users'

/**
 * Server gatekeeper that blocks half-finished OAuth accounts.
 *
 * An OAuth sign-up has a valid session immediately but no password / a
 * placeholder username until it submits the complete-profile form. This
 * middleware is the server-side twin of `app/middleware/user-layout.global.ts`:
 * it rejects such an account on every API route except the few needed to
 * finish setup or to log out.
 *
 * Individual handlers still keep their own `requireRole` / `requireCompleteUser`
 * guards; this is a coarse outer net so an incomplete user cannot reach any
 * other backend logic by calling the API directly.
 */

// Routes an incomplete user is still allowed to hit:
// - complete-profile : the form that finishes the account
// - logout           : custom logout route (POST /api/auth/logout)
// - _auth/session    : nuxt-auth-utils session read + clear (used by auth.clear())
const ALLOWED_PATHS = new Set([
  '/api/auth/user/complete-profile',
  '/api/_auth/session',
  '/api/auth/logout',
])

export default defineEventHandler(async (event) => {
  // Only guard API calls; page navigation is handled by the client middleware.
  if (!event.path.startsWith('/api/')) return

  // Strip any query string before matching (e.g. /api/_auth/session?foo=bar).
  const path = event.path.split('?')[0]!
  if (ALLOWED_PATHS.has(path)) return

  // No session -> let the individual handler decide (public routes stay public).
  const session = await getUserSession(event)
  if (!session?.user) return

  // Only regular users go through the completion flow; admins/authors are exempt.
  if (session.user.role !== 'user') return

  // Re-read from the DB so the flag can't be trusted from a stale sealed cookie.
  const account = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { profileCompleted: true },
  })

  if (account && !account.profileCompleted) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'Finish setting up your account before continuing.',
    })
  }
})
