import { getRequestURL, type H3Event } from 'h3'

/**
 * Defense-in-depth guard for the legacy privileged APIs.
 *
 * Individual handlers still keep their explicit authorization checks. This
 * middleware prevents a newly added admin or author route from accidentally
 * becoming public when a handler-level guard is forgotten.
 */
export default defineEventHandler(async (event) => {
  if (event.method === 'OPTIONS') return

  const pathname = getRequestURL(event).pathname
  const requiredRole = getRequiredRole(pathname)

  if (requiredRole) {
    await requireRole(event, requiredRole)
  }
})

function getRequiredRole(pathname: string): 'admin' | 'author' | null {
  if (isPathInside(pathname, '/api/admin')) return 'admin'
  if (isPathInside(pathname, '/api/author')) return 'author'
  return null
}

function isPathInside(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}
