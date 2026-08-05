import { getRequestURL } from 'h3'

/**
 * Central authorization classification for every `/api` route.
 *
 * Handlers still keep their own explicit guards. This middleware exists so a
 * route that FORGETS one cannot silently become public — the failure mode that
 * left `DELETE /api/articles/:slug` open to anonymous callers.
 *
 * ---------------------------------------------------------------------------
 * AUDIT MODE
 * ---------------------------------------------------------------------------
 * Privileged prefixes below are enforced, exactly as before. Session-tier and
 * unclassified routes are only LOGGED, so this file cannot break a page while
 * the classification is being verified against real traffic.
 *
 * To switch to deny-by-default, replace the two `warnOnce(...)` calls at the
 * bottom with the matching `throw createError({ statusCode: 401 })`.
 *
 * Pattern syntax: `*` matches one path segment, `**` matches the rest.
 * `ANY` matches every HTTP method.
 */

// Reachable without any session. Everything here is a deliberate decision.
const PUBLIC_ROUTES = [
  // Framework endpoints. Denying these breaks login and every icon in the UI.
  'ANY /api/_auth/session',
  'GET /api/_nuxt_icon/**',

  // Public reading surface.
  'GET /api/home',
  'GET /api/search',
  'GET /api/articles',
  'GET /api/articles/list',
  'GET /api/articles/comments',
  'GET /api/articles/related/*',
  'GET /api/articles/*',
  'GET /api/authors',
  'GET /api/authors/*',
  'GET /api/authors/*/articles',
  'GET /api/categories',
  'GET /api/categories/*/articles',
  'GET /api/comments',
  'GET /api/comments/*/focus',
  'GET /api/uploads/*',

  // Public writes. Each one is rate-limited and validated in its handler.
  'POST /api/articles/comments',
  'POST /api/articles/correction-requests',
  'POST /api/contact/submit',
  'POST /api/contact/verify',
  'POST /api/newsletter/subscribe',
  'POST /api/newsletter/confirm',
  'POST /api/newsletter/unsubscribe',

  // Authentication entry points must stay reachable without a session.
  'POST /api/auth/login',
  'POST /api/auth/author/login',
  'POST /api/auth/user/login',
  'POST /api/auth/user/register',
  'POST /api/auth/user/verify-email',
  'POST /api/auth/forgot-password',
  'POST /api/auth/reset-password',
  'POST /api/auth/logout',
  'GET /api/auth/user/facebook/login',
  'GET /api/auth/user/facebook/register',

  // Flutter contract probes and credential entry points.
  'GET /api/v1/health',
  'GET /api/v1/openapi.json',
  'POST /api/v1/admin/auth/login',
  'POST /api/v1/admin/auth/refresh',
]

// Require a signed-in account of any role. Their handlers already enforce this;
// audit mode only records anonymous hits so enforcement can be turned on later
// without breaking a client that legitimately calls them while logged out.
const SESSION_ROUTES = [
  'GET /api/auth/user/avatar',
  'POST /api/auth/user/complete-profile',
  'ANY /api/auth/user/profile/**',
  'GET /api/bookmarks',
  'POST /api/articles/*/bookmark',
  'DELETE /api/articles/*/bookmark',
  'POST /api/comments',
  'PATCH /api/comments/*',
  'DELETE /api/comments/*',
  'POST /api/comments/*/vote',
  'POST /api/comments/*/flag',
  'ANY /api/notifications/**',
]

// Versioned mobile routes open to a Flutter client without a bearer token.
const PUBLIC_MOBILE_ADMIN_ROUTES = new Set([
  '/api/v1/admin/auth/login',
  '/api/v1/admin/auth/refresh',
])

export default defineEventHandler(async (event) => {
  // Preflight carries no credentials; CORS handles it.
  if (event.method === 'OPTIONS') return

  const pathname = getRequestURL(event).pathname
  if (!pathname.startsWith('/api/')) return

  // ── Enforced tiers (unchanged behavior) ──────────────────────────────────
  if (isProtectedMobileAdminPath(pathname)) {
    await requireMobileAdmin(event)
    return
  }

  const requiredRole = getCookieSessionRole(pathname)
  if (requiredRole) {
    await requireRole(event, requiredRole)
    return
  }

  // ── Audited tiers (logged, not enforced) ─────────────────────────────────
  if (matchesAny(PUBLIC_ROUTES, event.method, pathname)) return

  if (matchesAny(SESSION_ROUTES, event.method, pathname)) {
    const session = await getUserSession(event)
    if (!session?.user) {
      warnOnce(`session route reached without a session: ${event.method} ${pathname}`)
    }
    return
  }

  warnOnce(`unclassified API route: ${event.method} ${pathname}`)
})

function isProtectedMobileAdminPath(pathname: string): boolean {
  return isPathInside(pathname, '/api/v1/admin')
    && !PUBLIC_MOBILE_ADMIN_ROUTES.has(pathname)
}

function getCookieSessionRole(pathname: string): 'admin' | 'author' | null {
  if (isPathInside(pathname, '/api/admin')) return 'admin'
  if (isPathInside(pathname, '/api/author')) return 'author'
  return null
}

function isPathInside(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

function matchesAny(routes: string[], method: string, pathname: string): boolean {
  return routes.some(route => matchesRoute(route, method, pathname))
}

function matchesRoute(route: string, method: string, pathname: string): boolean {
  const [routeMethod, pattern] = route.split(' ')
  if (!routeMethod || !pattern) return false
  if (routeMethod !== 'ANY' && routeMethod !== method) return false

  return matchesPattern(pattern, pathname)
}

/** `*` matches exactly one path segment, `**` matches every remaining one. */
function matchesPattern(pattern: string, pathname: string): boolean {
  const patternParts = pattern.split('/')
  const pathParts = pathname.split('/')

  for (const [index, expected] of patternParts.entries()) {
    if (expected === '**') return true

    const actual = pathParts[index]
    if (actual === undefined) return false
    if (expected !== '*' && expected !== actual) return false
  }

  return patternParts.length === pathParts.length
}

// Audit logging is deduplicated so a repeatedly called route cannot flood the
// server log, and capped so generated ids cannot grow the set without bound.
const reportedRoutes = new Set<string>()
const MAX_REPORTED_ROUTES = 500

function warnOnce(message: string): void {
  if (reportedRoutes.has(message) || reportedRoutes.size >= MAX_REPORTED_ROUTES) return

  reportedRoutes.add(message)
  console.warn(`[security] ${message}`)
}
