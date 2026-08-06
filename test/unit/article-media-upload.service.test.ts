import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * Upload rules for article media.
 *
 * Cloudinary and Sharp are mocked, but `validateArticleMediaFile()` runs for
 * real, so these tests also prove that the service accepts or rejects content
 * by its byte signature rather than by the multipart MIME the client declared.
 */

const mocks = vi.hoisted(() => ({
  uploadToCloudinary: vi.fn(),
  destroyManyFromCloudinary: vi.fn(),
  toBuffer: vi.fn(),
}))

vi.mock('~~/server/utils/cloudinary', () => ({
  uploadToCloudinary: mocks.uploadToCloudinary,
  destroyManyFromCloudinary: mocks.destroyManyFromCloudinary,
}))

// Minimal chainable stand-in for the Sharp pipeline used by the service.
vi.mock('sharp', () => {
  const pipeline = {
    rotate: () => pipeline,
    resize: () => pipeline,
    webp: () => pipeline,
    toBuffer: mocks.toBuffer,
  }
  return { default: () => pipeline }
})

interface TestError extends Error {
  statusCode?: number
}

// `createError` is a Nitro auto-import and does not exist in the plain-node
// unit project.
Object.assign(globalThis, {
  createError: (input: { statusCode: number, message?: string }): TestError => {
    const error: TestError = new Error(input.message ?? 'Error')
    error.statusCode = input.statusCode
    return error
  },
})

const { ArticleMediaUploadService, MAX_ARTICLE_MEDIA_BYTES } = await import('~~/server/services/article-media-upload.service')

// Real file signatures, so the service validates them the way it would in
// production.
const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
const MP4_BYTES = Buffer.from('0000ftypisom')
const TEXT_BYTES = Buffer.from('definitely not media')

function service() {
  return new ArticleMediaUploadService()
}

describe('ArticleMediaUploadService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.toBuffer.mockResolvedValue(Buffer.from('rendered-webp'))
    mocks.uploadToCloudinary.mockImplementation(
      async (_data: Buffer, _folder?: string, publicId?: string) => ({
        publicId: publicId ?? 'generated-id',
        url: `https://cdn.example.com/${publicId ?? 'generated-id'}`,
        posterUrl: null,
      }),
    )
    mocks.destroyManyFromCloudinary.mockResolvedValue(undefined)
  })

  it('uploads an image as three variants plus the preserved original', async () => {
    const result = await service().upload(PNG_BYTES, 'image/png')

    expect(result.type).toBe('image')
    expect(result.resourceType).toBe('image')
    expect(mocks.uploadToCloudinary).toHaveBeenCalledTimes(4)
    expect(result.imageVariants?.thumbnail).toBeTruthy()
    expect(result.imageVariants?.slider).toBeTruthy()
    expect(result.imageVariants?.main).toBeTruthy()
    expect(result.imageVariants?.original).toBeTruthy()

    // The stable media id points at the archival original, never at a variant.
    expect(result.mediaId).toContain('-original')
    expect(result.publicId).toBe(result.mediaId)

    // Nothing to clean up on a successful upload.
    expect(mocks.destroyManyFromCloudinary).not.toHaveBeenCalled()
  })

  it('generates storage ids on the server and ignores client filenames', async () => {
    await service().upload(PNG_BYTES)

    const publicIds = mocks.uploadToCloudinary.mock.calls.map(call => call[2] as string)

    // Every id is server generated from a timestamp and a UUID, so a hostile
    // filename cannot influence where the asset is stored.
    expect(publicIds).toHaveLength(4)
    for (const publicId of publicIds) {
      expect(publicId).toMatch(/^image-\d+-[0-9a-f-]{36}-(thumbnail|slider|main|original)$/)
    }
  })

  it('uploads a supported video in a single request without variants', async () => {
    const result = await service().upload(MP4_BYTES, 'video/mp4')

    expect(result.type).toBe('video')
    expect(result.resourceType).toBe('video')
    expect(result.imageVariants).toBeNull()

    // One request keeps upload progress meaningful for the mobile client.
    expect(mocks.uploadToCloudinary).toHaveBeenCalledOnce()
    expect(mocks.toBuffer).not.toHaveBeenCalled()
  })

  it('rejects an empty file before contacting Cloudinary', async () => {
    await expect(service().upload(Buffer.alloc(0))).rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.uploadToCloudinary).not.toHaveBeenCalled()
  })

  it('rejects an oversized file before contacting Cloudinary', async () => {
    // Only `length` is read before the size check, so a descriptor avoids
    // allocating 100 MiB of real memory in the test run.
    const oversized = { length: MAX_ARTICLE_MEDIA_BYTES + 1 } as unknown as Buffer

    await expect(service().upload(oversized)).rejects.toMatchObject({ statusCode: 413 })
    expect(mocks.uploadToCloudinary).not.toHaveBeenCalled()
  })

  it('rejects content that is not a supported image or video', async () => {
    await expect(service().upload(TEXT_BYTES)).rejects.toMatchObject({ statusCode: 415 })
    expect(mocks.uploadToCloudinary).not.toHaveBeenCalled()
  })

  it('rejects a declared MIME type that contradicts the file bytes', async () => {
    // A PNG announced as an MP4: trusting the declaration would let a client
    // route content past the image pipeline.
    await expect(service().upload(PNG_BYTES, 'video/mp4')).rejects.toMatchObject({ statusCode: 415 })
    expect(mocks.uploadToCloudinary).not.toHaveBeenCalled()
  })

  it('removes already uploaded variants when a later variant fails', async () => {
    mocks.uploadToCloudinary
      .mockResolvedValueOnce({ publicId: 'first-variant', url: 'https://cdn.example.com/first-variant' })
      .mockRejectedValueOnce(new Error('Cloudinary is unavailable'))

    await expect(service().upload(PNG_BYTES)).rejects.toThrow('Cloudinary is unavailable')

    // The orphaned variant must not survive the failed upload.
    expect(mocks.destroyManyFromCloudinary).toHaveBeenCalledWith([
      { publicId: 'first-variant', type: 'image' },
    ])
  })

  it('removes every variant when the original fails to upload', async () => {
    mocks.uploadToCloudinary
      .mockResolvedValueOnce({ publicId: 'thumbnail-id', url: 'https://cdn.example.com/thumbnail-id' })
      .mockResolvedValueOnce({ publicId: 'slider-id', url: 'https://cdn.example.com/slider-id' })
      .mockResolvedValueOnce({ publicId: 'main-id', url: 'https://cdn.example.com/main-id' })
      .mockRejectedValueOnce(new Error('Original upload failed'))

    await expect(service().upload(PNG_BYTES)).rejects.toThrow('Original upload failed')

    expect(mocks.destroyManyFromCloudinary).toHaveBeenCalledWith([
      { publicId: 'thumbnail-id', type: 'image' },
      { publicId: 'slider-id', type: 'image' },
      { publicId: 'main-id', type: 'image' },
    ])
  })
})
