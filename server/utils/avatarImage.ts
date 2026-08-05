import sharp from 'sharp'

/**
 * Avatar image processing.
 *
 * Rather than forcing the user to upload a small file, we accept any reasonable
 * image and normalize it server-side with sharp: auto-orient from EXIF,
 * resize to an exact square and re-encode to WebP. The output is small and
 * uniform regardless of the original size or format.
 */

/** Output dimensions of the stored avatar (square). */
const AVATAR_SIZE = 512

/** WebP quality for the encoded avatar. */
const AVATAR_QUALITY = 82

export const AVATAR_MIME_TYPE = 'image/webp'

/**
 * Generous safety cap on the *raw* upload to avoid decoding hostile or absurd
 * payloads. This is not a user-facing size limit on the final avatar; sharp
 * downscales whatever fits within it. (20 MB)
 */
export const MAX_RAW_UPLOAD_BYTES = 20 * 1024 * 1024

export interface ProcessedAvatar {
  data: Buffer
  mimeType: string
}

/**
 * Validates the raw upload is a non-empty, decodable image within the safety
 * cap, then returns a normalized square WebP avatar.
 */
export async function processAvatarImage(input: Buffer): Promise<ProcessedAvatar> {
  if (input.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Uploaded file is empty.' })
  }

  if (input.length > MAX_RAW_UPLOAD_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'File is too large.' })
  }

  try {
    const image = sharp(input, {
      failOn: 'error',
      limitInputPixels: 40_000_000,
      sequentialRead: true,
    })
    const metadata = await image.metadata()

    if (!metadata.format || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) {
      throw new Error('Unsupported avatar format')
    }

    const data = await image
      .rotate() // honor EXIF orientation before resizing
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
      .webp({ quality: AVATAR_QUALITY })
      .toBuffer()

    return { data, mimeType: AVATAR_MIME_TYPE }
  }
  catch {
    throw createError({
      statusCode: 415,
      statusMessage: 'Unsupported Media Type',
      message: 'The uploaded file must be a valid JPEG, PNG, WebP, or GIF image.',
    })
  }
}
