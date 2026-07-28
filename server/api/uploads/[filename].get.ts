import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { UPLOADS_DIR } from '~~/server/utils/upload'

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

/**
 * GET /api/uploads/:filename
 * Serves a previously uploaded file from `.data/uploads/`.
 *
 * `basename()` strips any path segments, preventing directory traversal.
 */
export default defineEventHandler(async (event) => {
  const requested = getRouterParam(event, 'filename') ?? ''
  const filename = basename(requested)
  const filePath = join(UPLOADS_DIR, filename)

  try {
    await stat(filePath)
  }
  catch {
    throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  }

  const contentType = CONTENT_TYPES[extname(filename).toLowerCase()] ?? 'application/octet-stream'
  setHeader(event, 'Content-Type', contentType)
  setHeader(event, 'Cache-Control', 'public, max-age=86400')

  return sendStream(event, createReadStream(filePath))
})
