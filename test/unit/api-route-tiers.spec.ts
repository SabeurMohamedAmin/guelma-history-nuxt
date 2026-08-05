import { describe, expect, it } from 'vitest'
import {
  PUBLIC_ROUTES,
  SESSION_ROUTES,
  getCookieSessionRole,
  isPathInside,
  isProtectedMobileAdminPath,
  matchesAnyRoute,
  matchesRoutePattern,
} from '~~/server/utils/apiRouteTiers'

/**
 * These rules decide whether a request is allowed once audit mode becomes
 * deny-by-default, so each case below maps to a real defect we do not want to
 * reintroduce.
 */

describe('matchesRoutePattern', () => {
  it('matches an exact path', () => {
    expect(matchesRoutePattern('/api/home', '/api/home')).toBe(true)
  })

  it('rejects a longer path than the pattern', () => {
    expect(matchesRoutePattern('/api/home', '/api/home/extra')).toBe(false)
  })

  it('matches exactly one segment with * and never spans a slash', () => {
    expect(matchesRoutePattern('/api/articles/*', '/api/articles/my-slug')).toBe(true)
    expect(matchesRoutePattern('/api/articles/*', '/api/articles/my-slug/bookmark')).toBe(false)
  })

  it('matches every remaining segment with **', () => {
    expect(matchesRoutePattern('/api/notifications/**', '/api/notifications')).toBe(true)
    expect(matchesRoutePattern('/api/notifications/**', '/api/notifications/42/read')).toBe(true)
  })
})

describe('matchesAnyRoute', () => {
  it('requires the method to match', () => {
    expect(matchesAnyRoute(PUBLIC_ROUTES, 'GET', '/api/articles/my-slug')).toBe(true)
    expect(matchesAnyRoute(PUBLIC_ROUTES, 'PATCH', '/api/articles/my-slug')).toBe(false)
  })

  it('never treats deleting an article as public', () => {
    // The original vulnerability: DELETE /api/articles/:slug ran with no guard.
    expect(matchesAnyRoute(PUBLIC_ROUTES, 'DELETE', '/api/articles/my-slug')).toBe(false)
    expect(matchesAnyRoute(SESSION_ROUTES, 'DELETE', '/api/articles/my-slug')).toBe(false)
  })

  it('never treats creating an article as public', () => {
    expect(matchesAnyRoute(PUBLIC_ROUTES, 'POST', '/api/articles')).toBe(false)
  })

  it('keeps the two comment systems apart', () => {
    // Guest comments are public by design; threaded comments need a session.
    expect(matchesAnyRoute(PUBLIC_ROUTES, 'POST', '/api/articles/comments')).toBe(true)
    expect(matchesAnyRoute(PUBLIC_ROUTES, 'POST', '/api/comments')).toBe(false)
    expect(matchesAnyRoute(SESSION_ROUTES, 'POST', '/api/comments')).toBe(true)
  })

  it('matches any method for an ANY entry', () => {
    expect(matchesAnyRoute(SESSION_ROUTES, 'PATCH', '/api/notifications/42/read')).toBe(true)
    expect(matchesAnyRoute(SESSION_ROUTES, 'DELETE', '/api/notifications/mutes/7')).toBe(true)
  })

  it('does not classify an unknown route', () => {
    expect(matchesAnyRoute(PUBLIC_ROUTES, 'GET', '/api/does-not-exist')).toBe(false)
    expect(matchesAnyRoute(SESSION_ROUTES, 'GET', '/api/does-not-exist')).toBe(false)
  })
})

describe('isPathInside', () => {
  it('respects segment boundaries', () => {
    // The deleted admin-auth.ts used a bare startsWith() and would have
    // treated this unrelated path as an admin route.
    expect(isPathInside('/api/administrators', '/api/admin')).toBe(false)
  })

  it('accepts the prefix itself and anything under it', () => {
    expect(isPathInside('/api/admin', '/api/admin')).toBe(true)
    expect(isPathInside('/api/admin/articles', '/api/admin')).toBe(true)
  })
})

describe('getCookieSessionRole', () => {
  it('maps the privileged prefixes to their minimum role', () => {
    expect(getCookieSessionRole('/api/admin/articles')).toBe('admin')
    expect(getCookieSessionRole('/api/author/articles')).toBe('author')
  })

  it('returns null for public prefixes', () => {
    expect(getCookieSessionRole('/api/articles')).toBeNull()
    expect(getCookieSessionRole('/api/v1/admin/articles')).toBeNull()
  })
})

describe('isProtectedMobileAdminPath', () => {
  it('protects the versioned mobile admin API', () => {
    expect(isProtectedMobileAdminPath('/api/v1/admin/articles')).toBe(true)
    expect(isProtectedMobileAdminPath('/api/v1/admin/auth/me')).toBe(true)
  })

  it('leaves only login and refresh reachable without a bearer token', () => {
    expect(isProtectedMobileAdminPath('/api/v1/admin/auth/login')).toBe(false)
    expect(isProtectedMobileAdminPath('/api/v1/admin/auth/refresh')).toBe(false)
  })

  it('ignores unversioned and non-admin paths', () => {
    expect(isProtectedMobileAdminPath('/api/v1/health')).toBe(false)
    expect(isProtectedMobileAdminPath('/api/articles')).toBe(false)
  })
})

describe('tier table safety', () => {
  it('never lists a privileged prefix as public', () => {
    const publicPatterns = PUBLIC_ROUTES.map(route => route.split(' ')[1] ?? '')

    const privileged = publicPatterns.filter(pattern =>
      pattern.startsWith('/api/admin')
      || pattern.startsWith('/api/author')
      || (pattern.startsWith('/api/v1/admin') && !pattern.startsWith('/api/v1/admin/auth/')),
    )

    expect(privileged).toEqual([])
  })

  it('declares a method for every entry', () => {
    for (const route of [...PUBLIC_ROUTES, ...SESSION_ROUTES]) {
      const [method, pattern] = route.split(' ')

      expect(method, `missing method in "${route}"`).toBeTruthy()
      expect(pattern, `missing pattern in "${route}"`).toMatch(/^\/api\//)
    }
  })
})
