import { adminProfileService } from '~~/server/services/admin-profile.service'
import { requireAdmin } from '~~/server/utils/auth'

/**
 * GET /api/admin/profile/avatar
 * Streams the authenticated admin avatar stored in PostgreSQL.
 *
 * The avatar is rendered in the persistent admin sidebar, so it is requested
 * on every navigation. To avoid re-downloading the blob each time, the URL is
 * content-versioned (`?v=avatarUpdatedAt`) and the response is marked
 * immutable. An ETag derived from the last update lets the browser revalidate
 * with a bodyless 304 in the rare case the cache is dropped.
 */
export default defineEventHandler(async (event) => {
  const { id } = await requireAdmin(event)
  const avatar = await adminProfileService.getAvatar(id)

  // Version the cache by the admin id + last update so a new upload busts it.
  const etag = `"avatar-${id}-${avatar.updatedAt?.getTime() ?? 0}"`

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
  // Long-lived + immutable: the `?v=` query already changes on every update,
  // so the browser can safely keep the bytes across route changes.
  setHeader(event, 'Cache-Control', 'private, max-age=31536000, immutable')

  return avatar.data
})
