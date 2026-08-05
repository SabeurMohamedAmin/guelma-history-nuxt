const signatures: ReadonlyArray<{
  mimeTypes: readonly string[]
  matches: (data: Buffer) => boolean
}> = [
  { mimeTypes: ['image/jpeg'], matches: data => startsWith(data, [0xFF, 0xD8, 0xFF]) },
  { mimeTypes: ['image/png'], matches: data => startsWith(data, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) },
  { mimeTypes: ['image/gif'], matches: data => data.subarray(0, 6).toString('ascii') === 'GIF87a' || data.subarray(0, 6).toString('ascii') === 'GIF89a' },
  { mimeTypes: ['image/webp'], matches: data => data.subarray(0, 4).toString('ascii') === 'RIFF' && data.subarray(8, 12).toString('ascii') === 'WEBP' },
  { mimeTypes: ['application/pdf'], matches: data => data.subarray(0, 5).toString('ascii') === '%PDF-' },
  { mimeTypes: ['application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], matches: data => startsWith(data, [0x50, 0x4B, 0x03, 0x04]) },
  { mimeTypes: ['text/plain', 'text/csv'], matches: isPlainText },
]

export function validateContactAttachment(data: Buffer, declaredType?: string): void {
  const normalizedType = declaredType?.split(';', 1)[0]?.trim().toLowerCase()
  const signature = signatures.find(candidate => candidate.matches(data))

  if (!signature || !normalizedType || !signature.mimeTypes.includes(normalizedType)) {
    throw createError({
      statusCode: 415,
      statusMessage: 'Unsupported Media Type',
      message: 'An attachment type does not match its file content.',
    })
  }
}

function startsWith(data: Buffer, bytes: readonly number[]): boolean {
  return bytes.every((byte, index) => data[index] === byte)
}

function isPlainText(data: Buffer): boolean {
  if (data.includes(0)) return false
  const sample = data.subarray(0, 8_192).toString('utf8')
  return !sample.includes('\uFFFD')
}
