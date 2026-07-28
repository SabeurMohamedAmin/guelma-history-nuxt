import { requireAdmin } from '~~/server/utils/auth'
import { uploadToCloudinary } from '~~/server/utils/cloudinary'

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

const ALLOWED_PREFIXES = ['image/', 'video/']

// Safety cap on the raw upload to avoid forwarding absurd payloads. Cloudinary
// optimizes/transcodes afterwards. (100 MB, generous for short videos.)
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const form = await readMultipartFormData(event)
  const filePart = form?.find(part => part.name === 'file' && part.filename)

  if (!filePart || !filePart.filename) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'No file provided.' })
  }

  const type = filePart.type?.toLowerCase() ?? ''
  if (!ALLOWED_PREFIXES.some(prefix => type.startsWith(prefix))) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Unsupported file type. Only images and videos are allowed.',
    })
  }

  if (filePart.data.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Uploaded file is empty.' })
  }

  if (filePart.data.length > MAX_UPLOAD_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'File is too large.' })
  }

  const uploaded = await uploadToCloudinary(filePart.data)

  return {
    url: uploaded.url,
    type: uploaded.resourceType === 'video' ? 'video' : 'image',
    posterUrl: uploaded.posterUrl,
    publicId: uploaded.publicId,
    // Persisted alongside the gallery item so deletion later targets the exact
    // Cloudinary resource_type instead of guessing from the display type.
    resourceType: uploaded.resourceType === 'video' ? 'video' : 'image',
  }
})
