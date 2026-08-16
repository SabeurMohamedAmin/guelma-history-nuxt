import { describe, expect, it } from 'vitest'
import { mediaAssetsToDestroy, type StoredMediaAsset } from '~~/server/utils/articleMediaCleanup'

/**
 * Which Cloudinary assets an article write may delete.
 *
 * The rule that matters: an item the editor kept must survive the save. The
 * payloads below are the ones the Nuxt admin and the Flutter app really send.
 */

const VARIANTS = {
  thumbnail: 'https://cdn.example.com/thumbnail.webp',
  slider: 'https://cdn.example.com/slider.webp',
  main: 'https://cdn.example.com/main.webp',
  original: 'https://cdn.example.com/original.jpg',
}

/** A stored image row, shaped like ArticleMediaUploadService produces it. */
function imageRow(baseId: string): StoredMediaAsset {
  return {
    type: 'image',
    publicId: `${baseId}-original`,
    resourceType: 'image',
    imageVariants: VARIANTS,
  }
}

function videoRow(publicId: string): StoredMediaAsset {
  return { type: 'video', publicId, resourceType: 'video', imageVariants: null }
}

function youtubeRow(): StoredMediaAsset {
  return { type: 'youtube', publicId: null, resourceType: null, imageVariants: null }
}

describe('mediaAssetsToDestroy', () => {
  it('destroys nothing when the write does not carry a gallery', () => {
    const existing = [imageRow('one'), videoRow('clip')]

    expect(mediaAssetsToDestroy(existing, undefined)).toEqual([])
  })

  it('keeps every image when an edit only adds one', () => {
    const existing = [imageRow('one'), imageRow('two'), imageRow('three')]
    const incoming = [
      { publicId: 'one-original' },
      { publicId: 'two-original' },
      { publicId: 'three-original' },
      { publicId: 'four-original' },
    ]

    expect(mediaAssetsToDestroy(existing, incoming)).toEqual([])
  })

  it('keeps every image when the gallery is only reordered', () => {
    const existing = [imageRow('one'), imageRow('two')]
    const incoming = [{ publicId: 'two-original' }, { publicId: 'one-original' }]

    expect(mediaAssetsToDestroy(existing, incoming)).toEqual([])
  })

  it('destroys a removed image with its three renditions', () => {
    const existing = [imageRow('one'), imageRow('two')]

    expect(mediaAssetsToDestroy(existing, [{ publicId: 'two-original' }])).toEqual([
      { publicId: 'one-original', type: 'image' },
      { publicId: 'one-thumbnail', type: 'image' },
      { publicId: 'one-slider', type: 'image' },
      { publicId: 'one-main', type: 'image' },
    ])
  })

  it('destroys a removed video once, as a video resource', () => {
    expect(mediaAssetsToDestroy([videoRow('clip')], [])).toEqual([
      { publicId: 'clip', type: 'video' },
    ])
  })

  it('ignores rows that own no Cloudinary asset', () => {
    expect(mediaAssetsToDestroy([youtubeRow()], [])).toEqual([])
  })

  it('destroys a legacy row without renditions as a single asset', () => {
    const legacy: StoredMediaAsset = {
      type: 'image',
      publicId: 'articles/legacy-upload',
      resourceType: null,
      imageVariants: null,
    }

    expect(mediaAssetsToDestroy([legacy], [])).toEqual([
      { publicId: 'articles/legacy-upload', type: 'image' },
    ])
  })

  it('destroys everything when the article itself is deleted', () => {
    const existing = [imageRow('one'), videoRow('clip')]

    // Four assets for the image, one for the video.
    expect(mediaAssetsToDestroy(existing, [])).toHaveLength(5)
  })
})
