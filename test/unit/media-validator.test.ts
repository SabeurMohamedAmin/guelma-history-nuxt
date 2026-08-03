import { describe, expect, it } from 'vitest'
import { deleteCloudinaryMediaSchema } from '~~/server/validators/media.validator'

describe('media deletion validation', () => {
  it('accepts normal Cloudinary public IDs', () => {
    expect(deleteCloudinaryMediaSchema.safeParse({ publicId: 'articles/image-id', resourceType: 'image' }).success).toBe(true)
  })

  it('rejects URLs, traversal, and unknown fields', () => {
    expect(deleteCloudinaryMediaSchema.safeParse({ publicId: 'https://example.com/a', resourceType: 'image' }).success).toBe(false)
    expect(deleteCloudinaryMediaSchema.safeParse({ publicId: '../secret', resourceType: 'video' }).success).toBe(false)
    expect(deleteCloudinaryMediaSchema.safeParse({ publicId: 'safe', resourceType: 'image', force: true }).success).toBe(false)
  })
})
