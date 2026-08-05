import { articleMediaUploadService } from '~~/server/services/article-media-upload.service'
import { requireAdmin } from '~~/server/utils/auth'

/**
 * POST /api/admin/articles/media/upload
 *
 * Server-side signed upload (Option A): the browser sends a single multipart
 * file under the `file` field; we forward the bytes to Cloudinary using the
 * server-only API secret and return the CDN URL the editor stores in the
 * gallery item. Supports images and videos (resource_type: 'auto').
 *
 * The Cloudinary secret never reaches the client, mirroring the avatar upload.
 */

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const form = await readMultipartFormData(event)
  const filePart = form?.find(part => part.name === 'file' && part.filename)

  if (!filePart || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'No file provided.' })
  }

  const uploaded = await articleMediaUploadService.upload(filePart.data, filePart.type)

  // Preserve the legacy web response contract while sharing the hardened
  // validation, processing, and partial-failure cleanup used by Flutter.
  const { mediaId: _mediaId, ...legacyResponse } = uploaded
  return legacyResponse
})
