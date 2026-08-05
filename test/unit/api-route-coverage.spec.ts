import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  PUBLIC_ROUTES,
  SESSION_ROUTES,
  getCookieSessionRole,
  isProtectedMobileAdminPath,
  matchesAnyRoute,
} from '~~/server/utils/apiRouteTiers'

/**
 * Guards the deny-by-default switch (NUXT_ENFORCE_API_ROUTE_TIERS).
 *
 * Enforcement rejects any /api request that is not classified, so a new route
 * file added without a tier decision would start failing in production the day
 * the switch is flipped. This test walks the real `server/api/**` file tree and
 * fails the suite the moment a handler exists that is neither:
 *
 * - under a privileged prefix (/api/admin, /api/author, /api/v1/admin), nor
 * - listed in PUBLIC_ROUTES or SESSION_ROUTES.
 *
 * The failure message names the exact `METHOD /api/...` route so the author
 * only has to add one deliberate line to the right table.
 */

const API_DIR = join(process.cwd(), 'server', 'api')

/** Method suffixes Nitro recognizes in handler filenames. */
const METHODS = new Set(['get', 'post', 'patch', 'put', 'delete', 'head', 'options'])

interface DiscoveredRoute {
  method: string
  path: string
}

/**
 * A dynamic segment like [slug] or [id] can be ANY value at runtime, so it is
 * replaced with a literal that no fixed pattern segment uses. Only a `*` (or
 * `**`) pattern segment can match it, exactly like a real request would.
 */
function toPathSegment(name: string): string {
  return name.startsWith('[') && name.endsWith(']') ? 'route-param' : name
}

/** Recursively derive `METHOD /api/...` routes from the handler file tree. */
function discoverRoutes(dir: string, prefix: string, found: DiscoveredRoute[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      discoverRoutes(join(dir, entry.name), `${prefix}/${toPathSegment(entry.name)}`, found)
      continue
    }
    if (!entry.name.endsWith('.ts')) continue

    // "openapi.json.get.ts" -> name parts [openapi, json, get]; the last part
    // is the HTTP method when recognized, the rest is the path segment.
    const parts = entry.name.slice(0, -'.ts'.length).split('.')
    const last = parts[parts.length - 1] ?? ''
    const hasMethod = METHODS.has(last)
    const method = hasMethod ? last.toUpperCase() : 'GET'
    const name = (hasMethod ? parts.slice(0, -1) : parts).join('.')

    // An "index" file maps to its directory path, any other file appends a segment.
    const path = name === 'index' ? prefix : `${prefix}/${toPathSegment(name)}`
    found.push({ method, path })
  }
}

function isClassified({ method, path }: DiscoveredRoute): boolean {
  // Legacy privileged prefixes: the middleware requires a cookie role.
  if (getCookieSessionRole(path) !== null) return true

  // Versioned mobile admin routes: the middleware requires a bearer session
  // (login and refresh fall through to the public table below).
  if (isProtectedMobileAdminPath(path)) return true

  return matchesAnyRoute(PUBLIC_ROUTES, method, path)
    || matchesAnyRoute(SESSION_ROUTES, method, path)
}

describe('api route tier coverage', () => {
  const routes: DiscoveredRoute[] = []
  discoverRoutes(API_DIR, '/api', routes)

  it('discovers the handler files', () => {
    // Sanity check: an empty or wrong directory would make the next test pass
    // vacuously. The API has far more than 50 handlers.
    expect(routes.length).toBeGreaterThan(50)
  })

  it('classifies every route file into a tier', () => {
    const unclassified = routes
      .filter(route => !isClassified(route))
      .map(route => `${route.method} ${route.path}`)
      .sort()

    // A route listed here needs ONE deliberate decision: add it to
    // PUBLIC_ROUTES or SESSION_ROUTES in server/utils/apiRouteTiers.ts, or
    // place it under a privileged prefix. Never silence this test.
    expect(unclassified).toEqual([])
  })
})
