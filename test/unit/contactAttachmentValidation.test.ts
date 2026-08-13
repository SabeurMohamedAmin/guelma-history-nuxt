import { describe, expect, it } from 'vitest'
import { validateContactAttachment } from '~~/server/utils/contactAttachmentValidation'

describe('contact attachment validation', () => {
  it('accepts a matching PNG signature', () => {
    const png = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
    expect(() => validateContactAttachment(png, 'image/png')).not.toThrow()
  })

  it('accepts MIME parameters for plain text', () => {
    expect(() => validateContactAttachment(Buffer.from('hello'), 'text/plain; charset=utf-8')).not.toThrow()
  })

  it('rejects a declared MIME mismatch', () => {
    const pdf = Buffer.from('%PDF-1.7')
    expect(() => validateContactAttachment(pdf, 'image/png')).toThrow()
  })

  it('rejects binary content declared as text', () => {
    expect(() => validateContactAttachment(Buffer.from([0, 1, 2]), 'text/plain')).toThrow()
  })
})
