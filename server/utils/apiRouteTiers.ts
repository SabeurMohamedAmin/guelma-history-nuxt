/**
 * Authorization tiers for every `/api` route, plus the pure matching helpers.
 *
 * This module holds POLICY and contains no H3 or Nitro calls, so it can be
 * unit tested directly. Enforcement lives in
 * `server/middleware/privileged-api-auth.ts`.
 *
 * Pattern syntax:
 * - `*`  matches exactly one path segment and never spans a `/`
 * - `**` matches every remaining segment
 * - `ANY` as the method matches every HTTP method
 */

/** Reachable without any session. Every entry is a deliberate decision. */
export const PUBLIC_ROUTES = [
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

/**
 * Require a signed-in account of any role. Their handlers already enforce this;
 * audit mode only records anonymous hits so enforcement can be enabled later
 * without breaking a client that legitimately calls them while logged out.
 */
export const SESSION_ROUTES = [
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

/** Versioned mobile routes a Flutter client may call without a bearer token. */
export const PUBLIC_MOBILE_ADMIN_ROUTES = new Set([
  '/api/v1/admin/auth/login',
  '/api/v1/admin/auth/refresh',
])

/** True when the path needs a valid Flutter bearer session. */
export function isProtectedMobileAdminPath(pathname: string): boolean {
  return isPathInside(pathname, '/api/v1/admin')
    && !PUBLIC_MOBILE_ADMIN_ROUTES.has(pathname)
}

/** Minimum cookie-session role for the legacy privileged prefixes. */
export function getCookieSessionRole(pathname: string): 'admin' | 'author' | null {
  if (isPathInside(pathname, '/api/admin')) return 'admin'
  if (isPathInside(pathname, '/api/author')) return 'author'
  return null
}

/**
 * Prefix test that respects segment boundaries: `/api/administrators` is NOT
 * inside `/api/admin`. A bare `startsWith()` would say it is.
 */
export function isPathInside(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

/** True when any `METHOD pattern` entry matches this request. */
export function matchesAnyRoute(routes: string[], method: string, pathname: string): boolean {
  return routes.some(route => matchesRoute(route, method, pathname))
}

/** Match one `METHOD pattern` entry against a request. */
export function matchesRoute(route: string, method: string, pathname: string): boolean {
  const [routeMethod, pattern] = route.split(' ')
  if (!routeMethod || !pattern) return false
  if (routeMethod !== 'ANY' && routeMethod !== method) return false

  return matchesRoutePattern(pattern, pathname)
}

/** `*` matches exactly one path segment, `**` matches every remaining one. */
export function matchesRoutePattern(pattern: string, pathname: string): boolean {
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
