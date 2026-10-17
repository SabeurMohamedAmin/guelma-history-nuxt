import { getRequestURL } from 'h3'
import {
  PUBLIC_ROUTES,
  SESSION_ROUTES,
  getCookieSessionRole,
  isProtectedMobileAdminPath,
  matchesAnyRoute,
  shouldEnforceApiRouteTiers,
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
 * AUDIT vs ENFORCE
 * ---------------------------------------------------------------------------
 * Privileged prefixes are ALWAYS enforced. What the runtime flag
 * `enforceApiRouteTiers` (NUXT_ENFORCE_API_ROUTE_TIERS) controls is the rest:
 *
 * - development: audit mode is available unless explicitly enabled.
 * - production: enforcement is unconditional; an environment override cannot
 *   put the deployed server back into audit-only mode.
 *
 * Enable it in development first and watch for `[security]` warnings before
 * turning it on in production.
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

  const { enforceApiRouteTiers: configuredEnforcement } = useRuntimeConfig(event)
  const enforceApiRouteTiers = shouldEnforceApiRouteTiers(
    process.env.NODE_ENV,
    configuredEnforcement,
  )

  if (matchesAnyRoute(SESSION_ROUTES, event.method, pathname)) {
    if (enforceApiRouteTiers) {
      // 'user' and NOT requireCompleteUser: the reading list must keep working
      // for an OAuth sign-up that has not finished onboarding yet. Handlers
      // still apply their own stricter guard where they need one.
      await requireRole(event, 'user')
      return
    }

    const session = await getUserSession(event)
    if (!session?.user) {
      warnOnce(`session route reached without a session: ${event.method} ${pathname}`)
    }
    return
  }

  if (enforceApiRouteTiers) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      message: 'Authentication required.',
    })
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
