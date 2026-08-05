import { getRequestURL } from 'h3'
import {
  PUBLIC_ROUTES,
  SESSION_ROUTES,
  getCookieSessionRole,
  isProtectedMobileAdminPath,
  matchesAnyRoute,
} from '~~/server/utils/apiRouteTiers'

/**
 * Central authorization guard for every `/api` route.
 *
 * Handlers still keep their own explicit guards. This middleware exists so a
 * route that FORGETS one cannot silently become public — the failure mode that
 * left `DELETE /api/articles/:slug` open to anonymous callers.
 *
 * The tier tables and matching rules live in `server/utils/apiRouteTiers.ts`,
 * which is pure and unit tested. This file only enforces and logs.
 *
 * ---------------------------------------------------------------------------
 * AUDIT MODE
 * ---------------------------------------------------------------------------
 * Privileged prefixes are enforced, exactly as before. Session-tier and
 * unclassified routes are only LOGGED, so this file cannot break a page while
 * the classification is verified against real traffic.
 *
 * To switch to deny-by-default, replace the two `warnOnce(...)` calls below
 * with `throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })`.
 */
export default defineEventHandler(async (event) => {
  // Preflight carries no credentials; CORS handles it.
  if (event.method === 'OPTIONS') return

  const pathname = getRequestURL(event).pathname
  if (!pathname.startsWith('/api/')) return

  // ── Enforced tiers ────────────────────────────────────────────────────
  if (isProtectedMobileAdminPath(pathname)) {
    await requireMobileAdmin(event)
    return
  }

  const requiredRole = getCookieSessionRole(pathname)
  if (requiredRole) {
    await requireRole(event, requiredRole)
    return
  }

  // ── Audited tiers ───────────────────────────────────────────────────
  if (matchesAnyRoute(PUBLIC_ROUTES, event.method, pathname)) return

  if (matchesAnyRoute(SESSION_ROUTES, event.method, pathname)) {
    const session = await getUserSession(event)
    if (!session?.user) {
      warnOnce(`session route reached without a session: ${event.method} ${pathname}`)
    }
    return
  }

  warnOnce(`unclassified API route: ${event.method} ${pathname}`)
})

// Audit logging is deduplicated so a repeatedly called route cannot flood the
// server log, and capped so generated ids cannot grow the set without bound.
const reportedRoutes = new Set<string>()
const MAX_REPORTED_ROUTES = 500

function warnOnce(message: string): void {
  if (reportedRoutes.has(message) || reportedRoutes.size >= MAX_REPORTED_ROUTES) return

  reportedRoutes.add(message)
  console.warn(`[security] ${message}`)
}
