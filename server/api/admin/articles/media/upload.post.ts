import sharp from 'sharp'
import type { FitEnum } from 'sharp'
import type { ImageVariants } from '~~/shared/types/article'
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

  // Videos keep their original upload path. For images, Sharp creates display
  // variants that match their UI containers. The uploaded source stays
  // untouched for focus mode, zooming, copying, and downloading.
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

  type DisplayVariantName = Exclude<keyof ImageVariants, 'original'>
  type DisplayVariantOptions = {
    width: number
    height?: number
    quality: number
    fit: keyof FitEnum
  }

  const baseId = `image-${Date.now()}-${crypto.randomUUID()}`
  const variantDefinitions: Record<DisplayVariantName, DisplayVariantOptions> = {
    thumbnail: { width: 320, height: 200, quality: 80, fit: 'fill' },
    // Width-only resizing preserves the original aspect ratio. Sharp ignores
    // `position` with `fill` because there is no crop area to align.
    slider: { width: 960, quality: 82, fit: 'fill' },
    main: { width: 1280, height: 800, quality: 82, fit: 'fill' },
  }

  const variantEntries = await Promise.all(
    Object.entries(variantDefinitions).map(async ([name, options]) => {
    const buffer = await sharp(filePart.data, { failOn: 'error' })
      .rotate()
      .resize({
        width: options.width,
        height: options.height,
        fit: options.fit,
        withoutEnlargement: true,
      })
      .webp({ quality: options.quality })
      .toBuffer()
      const uploaded = await uploadToCloudinary(buffer, 'articles', `${baseId}-${name}`)
      return [name, uploaded] as const
    }),
  )

  // Do not resize, crop, or re-encode the source. This preserves its original
  // dimensions, format, metadata, and quality for full-resolution actions.
  const originalUpload = await uploadToCloudinary(
    filePart.data,
    'articles',
    `${baseId}-original`,
  )
  const allEntries = [...variantEntries, ['original', originalUpload] as const]
  const variants = Object.fromEntries(
    allEntries.map(([name, result]) => [name, result.url]),
  ) as ImageVariants

  return {
    url: variants.main,
    type: 'image' as const,
    posterUrl: null,
    publicId: originalUpload.publicId,
    resourceType: 'image' as const,
    imageVariants: variants,
  }
})
