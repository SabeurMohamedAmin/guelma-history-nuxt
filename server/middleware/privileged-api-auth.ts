import { getRequestURL } from 'h3'

const publicMobileAdminRoutes = new Set([
  '/api/v1/admin/auth/login',
  '/api/v1/admin/auth/refresh',
])

/**
 * Defense-in-depth guard for privileged APIs.
 *
 * Individual handlers still keep explicit authorization checks. This
 * middleware prevents a newly added privileged route from accidentally
 * becoming public when a handler-level guard is forgotten.
 */
export default defineEventHandler(async (event) => {
  if (event.method === 'OPTIONS') return

  const pathname = getRequestURL(event).pathname

  if (isProtectedMobileAdminPath(pathname)) {
    await requireMobileAdmin(event)
    return
  }

  const requiredRole = getCookieSessionRole(pathname)
  if (requiredRole) {
    await requireRole(event, requiredRole)
  }
})

function isProtectedMobileAdminPath(pathname: string): boolean {
  return isPathInside(pathname, '/api/v1/admin')
    && !publicMobileAdminRoutes.has(pathname)
}

function getCookieSessionRole(pathname: string): 'admin' | 'author' | null {
  if (isPathInside(pathname, '/api/admin')) return 'admin'
  if (isPathInside(pathname, '/api/author')) return 'author'
  return null
}

function isPathInside(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}
