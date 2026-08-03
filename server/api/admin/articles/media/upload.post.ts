import sharp from 'sharp'
import type { FitEnum } from 'sharp'
import type { ImageVariants } from '~~/shared/types/article'
import { requireAdmin } from '~~/server/utils/auth'
import { uploadToCloudinary } from '~~/server/utils/cloudinary'
import { validateArticleMediaFile } from '~~/server/utils/mediaFileValidation'

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

  const fileData = filePart.data

  if (fileData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Uploaded file is empty.' })
  }

  if (fileData.length > MAX_UPLOAD_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'Payload Too Large', message: 'File is too large.' })
  }

  const type = validateArticleMediaFile(fileData, filePart.type)

  // Videos keep their original upload path. For images, Sharp creates display
  // variants that match their UI containers. The uploaded source stays
  // untouched for focus mode, zooming, copying, and downloading.
  if (!type.startsWith('image/')) {
    const uploaded = await uploadToCloudinary(fileData)
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

  async function uploadVariant(name: DisplayVariantName): Promise<string> {
    const options = variantDefinitions[name]
    const buffer = await sharp(fileData, { failOn: 'error' })
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

    return uploaded.url
  }

  const [thumbnail, slider, main] = await Promise.all([
    uploadVariant('thumbnail'),
    uploadVariant('slider'),
    uploadVariant('main'),
  ])

  // Do not resize, crop, or re-encode the source. This preserves its original
  // dimensions, format, metadata, and quality for full-resolution actions.
  const originalUpload = await uploadToCloudinary(
    fileData,
    'articles',
    `${baseId}-original`,
  )
  const variants: ImageVariants = {
    thumbnail,
    slider,
    main,
    original: originalUpload.url,
  }

  return {
    url: variants.main,
    type: 'image' as const,
    posterUrl: null,
    publicId: originalUpload.publicId,
    resourceType: 'image' as const,
    imageVariants: variants,
  }
})
