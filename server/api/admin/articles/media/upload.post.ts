import sharp from 'sharp'
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

  // Videos keep their original upload path. Images are normalized once with
  // Sharp and stored as purpose-built WebP files, avoiding a 1024px source in
  // every thumbnail while retaining a high-quality original for the lightbox.
  if (!type.startsWith('image/')) {
    const uploaded = await uploadToCloudinary(filePart.data)
    return {
      url: uploaded.url,
      type: 'video' as const,
      posterUrl: uploaded.posterUrl,
      publicId: uploaded.publicId,
      resourceType: 'video' as const,
      imageVariants: null,
    }
  }

  const baseId = `image-${Date.now()}-${crypto.randomUUID()}`
  const definitions = {
    thumbnail: { width: 320, quality: 72 },
    slider: { width: 960, quality: 80 },
    main: { width: 1280, quality: 84 },
    original: { width: 2000, quality: 90 },
  } as const

  const entries = await Promise.all(Object.entries(definitions).map(async ([name, options]) => {
    const buffer = await sharp(filePart.data, { failOn: 'error' })
      .rotate()
      .resize({ width: options.width, withoutEnlargement: true })
      .webp({ quality: options.quality })
      .toBuffer()
    const uploaded = await uploadToCloudinary(buffer, 'articles', `${baseId}-${name}`)
    return [name, uploaded] as const
  }))

  const variants = Object.fromEntries(entries.map(([name, result]) => [name, result.url])) as {
    thumbnail: string
    slider: string
    main: string
    original: string
  }
  const originalUpload = entries.find(([name]) => name === 'original')![1]

  return {
    url: variants.main,
    type: 'image' as const,
    posterUrl: null,
    publicId: originalUpload.publicId,
    resourceType: 'image' as const,
    imageVariants: variants,
  }
})
