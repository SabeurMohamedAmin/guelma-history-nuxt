export const ARTICLE_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const

export type ArticleMediaMimeType = typeof ARTICLE_MEDIA_MIME_TYPES[number]

/** Detect supported media from file bytes instead of trusting multipart MIME. */
export function detectArticleMediaType(data: Buffer): ArticleMediaMimeType | null {
  if (startsWith(data, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png'
  if (ascii(data, 0, 4) === 'RIFF' && ascii(data, 8, 4) === 'WEBP') return 'image/webp'
  if (['GIF87a', 'GIF89a'].includes(ascii(data, 0, 6))) return 'image/gif'
  if (startsWith(data, [0x1a, 0x45, 0xdf, 0xa3])) return 'video/webm'

  // ISO Base Media files identify their concrete format with the ftyp brand.
  if (ascii(data, 4, 4) === 'ftyp') {
    const brand = ascii(data, 8, 4)
    if (['qt  '].includes(brand)) return 'video/quicktime'
    if (['avc1', 'dash', 'iso2', 'iso5', 'iso6', 'isom', 'm4v ', 'mp41', 'mp42'].includes(brand)) return 'video/mp4'
  }

  return null
}

export function validateArticleMediaFile(data: Buffer, declaredType?: string): ArticleMediaMimeType {
  const detectedType = detectArticleMediaType(data)
  if (!detectedType) {
    throw createError({ statusCode: 415, statusMessage: 'Unsupported Media Type', message: 'File content is not a supported image or video.' })
  }

  const normalizedDeclaredType = declaredType?.toLowerCase().split(';', 1)[0]?.trim()
  if (normalizedDeclaredType && normalizedDeclaredType !== detectedType) {
    throw createError({ statusCode: 415, statusMessage: 'Unsupported Media Type', message: 'Declared MIME type does not match file content.' })
  }

  return detectedType
}

function startsWith(data: Buffer, signature: number[]): boolean {
  return data.length >= signature.length && signature.every((byte, index) => data[index] === byte)
}

function ascii(data: Buffer, offset: number, length: number): string {
  return data.length >= offset + length ? data.subarray(offset, offset + length).toString('ascii') : ''
}
