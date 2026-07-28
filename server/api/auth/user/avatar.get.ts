import { requireRole } from '~~/server/utils/auth'
import { getUserAvatar } from '~~/server/utils/userProfile'

/**
 * GET /api/auth/user/avatar
 * Streams the authenticated user's profile picture stored in PostgreSQL.
 *
 * Mirrors the admin avatar endpoint: the URL is content-versioned
 * (`?v=avatarUpdatedAt`) and the response is marked immutable so the browser
 * keeps the bytes across navigations; an ETag allows a bodyless 304 revalidate.
 */
export default defineEventHandler(async (event) => {
  const { id } = await requireRole(event, 'user')
  const avatar = await getUserAvatar(id)

  // Version the cache by the user id + last update so a new upload busts it.
  const etag = `"user-avatar-${id}-${avatar.updatedAt?.getTime() ?? 0}"`

  if (getHeader(event, 'if-none-match') === etag) {
    setResponseStatus(event, 304)
    setHeader(event, 'ETag', etag)
    setHeader(event, 'Cache-Control', 'private, max-age=31536000, immutable')
    return null
  }

  if (avatar.updatedAt) {
    setHeader(event, 'Last-Modified', avatar.updatedAt.toUTCString())
  }

  setHeader(event, 'ETag', etag)
  setHeader(event, 'Content-Type', avatar.mimeType)
  setHeader(event, 'Content-Length', avatar.data.length)
  setHeader(event, 'Cache-Control', 'private, max-age=31536000, immutable')

  return avatar.data
})
