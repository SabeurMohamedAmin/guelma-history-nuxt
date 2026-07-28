import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

/**
 * Upload validation helpers shared by image endpoints.
 *
 * Admin profile avatars are stored in PostgreSQL as bytea blobs. The legacy
 * filesystem helpers remain exported because public uploads are still served
 * from `.data/uploads` through `/api/uploads/:filename`.
 */

export const UPLOADS_DIR = join(process.cwd(), '.data', 'uploads')

const ALLOWED_IMAGE_TYPES = new Map([
  ['image/jpeg', ['.jpg', '.jpeg']],
  ['image/png', ['.png']],
  ['image/webp', ['.webp']],
  ['image/gif', ['.gif']],
])

const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2 MB

export interface UploadedImage {
  filename: string
  data: Buffer
  type?: string
}

export interface ValidatedImage {
  data: Buffer
  mimeType: string
}

export function validateUploadedImage(file: UploadedImage): ValidatedImage {
  const extension = extname(file.filename).toLowerCase()
  const mimeType = file.type?.toLowerCase() ?? ''
  const allowedExtensions = ALLOWED_IMAGE_TYPES.get(mimeType)

  if (!allowedExtensions || !allowedExtensions.includes(extension)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Unsupported file type. Allowed: jpg, png, webp, gif.',
    })
  }

  if (file.data.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Uploaded file is empty.',
    })
  }

  if (file.data.length > MAX_IMAGE_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'File is too large (max 2 MB).',
    })
  }

  return { data: file.data, mimeType }
}

export async function saveUploadedImage(file: UploadedImage): Promise<string> {
  validateUploadedImage(file)

  await mkdir(UPLOADS_DIR, { recursive: true })

  const extension = extname(file.filename).toLowerCase()
  const safeName = `${Date.now()}-${randomBytes(8).toString('hex')}${extension}`
  await writeFile(join(UPLOADS_DIR, safeName), file.data)

  return safeName
}
