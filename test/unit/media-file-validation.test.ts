import { describe, expect, it } from 'vitest'
import { detectArticleMediaType, validateArticleMediaFile } from '~~/server/utils/mediaFileValidation'

describe('article media file validation', () => {
  it('detects supported image signatures', () => {
    expect(detectArticleMediaType(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe('image/jpeg')
    expect(detectArticleMediaType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png')
    expect(detectArticleMediaType(Buffer.from('RIFF0000WEBP'))).toBe('image/webp')
  })

  it('detects supported video containers', () => {
    expect(detectArticleMediaType(Buffer.from('0000ftypisom'))).toBe('video/mp4')
    expect(detectArticleMediaType(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))).toBe('video/webm')
  })

  it('rejects unknown content and MIME mismatches', () => {
    expect(detectArticleMediaType(Buffer.from('plain text'))).toBeNull()
    expect(() => validateArticleMediaFile(Buffer.from([0xff, 0xd8, 0xff]), 'image/png')).toThrow()
  })
})
