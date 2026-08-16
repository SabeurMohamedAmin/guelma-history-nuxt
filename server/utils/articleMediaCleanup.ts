import type { CloudinaryAsset } from '~~/server/utils/cloudinary'

/**
 * Decides which Cloudinary assets an article write is allowed to delete.
 *
 * Saving an article replaces all of its `article_media` rows, but the files
 * behind those rows are shared with the payload the editor just sent: an edit
 * that adds a fourth picture still references the first three. Freeing
 * everything that existed before the write therefore destroys assets the
 * article still displays, so the incoming public ids decide what survives.
 */

/** The parts of a stored `article_media` row that describe its storage. */
export interface StoredMediaAsset {
  /** Display kind: `image`, `video` or `youtube`. */
  type: string
  /** Cloudinary public id, null for YouTube links and manual URLs. */
  publicId?: string | null
  /** Cloudinary resource type captured at upload time. */
  resourceType?: string | null
  /** Present when the upload pipeline generated the image renditions. */
  imageVariants?: unknown
}

/** The only part of an incoming media item that matters for cleanup. */
export interface IncomingMediaAsset {
  publicId?: string | null
}

/** Suffix of the archival asset recorded in `article_media.public_id`. */
const ORIGINAL_SUFFIX = '-original'

/** Renditions uploaded beside the original by ArticleMediaUploadService. */
const IMAGE_VARIANT_SUFFIXES = ['thumbnail', 'slider', 'main'] as const

/**
 * Assets to destroy after a write, from the rows that existed before it and
 * the media array the client sent.
 *
 * - `undefined`: the client did not touch the gallery, so nothing is removed.
 * - An empty array: every item is gone, so everything is removed. Article
 *   deletion uses this form.
 * - Anything else: only the items whose public id disappeared are removed.
 */
export function mediaAssetsToDestroy(
  existing: StoredMediaAsset[],
  incoming: IncomingMediaAsset[] | undefined,
): CloudinaryAsset[] {
  if (incoming === undefined) return []

  const keptPublicIds = new Set(
    incoming
      .map(item => normalizePublicId(item.publicId))
      .filter(publicId => publicId !== ''),
  )

  return existing.flatMap((item) => {
    const publicId = normalizePublicId(item.publicId)
    // A row without a public id owns no storage: YouTube links and manual URLs
    // point at files this application never uploaded.
    if (publicId === '' || keptPublicIds.has(publicId)) return []
    return assetsOf(publicId, item)
  })
}

/**
 * Every Cloudinary asset stored for one media row.
 *
 * An uploaded image is four separate assets: the `-original` recorded in
 * `publicId`, plus the thumbnail, slider and main renditions uploaded next to
 * it. Removing only the original would leave three orphans in storage forever.
 * A video is a single asset, and legacy rows saved before the rendition
 * pipeline keep the old one-asset behaviour.
 */
function assetsOf(publicId: string, item: StoredMediaAsset): CloudinaryAsset[] {
  const type = item.resourceType ?? (item.type === 'video' ? 'video' : 'image')
  const original: CloudinaryAsset = { publicId, type }

  const hasRenditions = type === 'image'
    && Boolean(item.imageVariants)
    && publicId.endsWith(ORIGINAL_SUFFIX)

  if (!hasRenditions) return [original]

  const baseId = publicId.slice(0, -ORIGINAL_SUFFIX.length)
  return [
    original,
    ...IMAGE_VARIANT_SUFFIXES.map(suffix => ({
      publicId: `${baseId}-${suffix}`,
      type: 'image',
    })),
  ]
}

function normalizePublicId(publicId: string | null | undefined): string {
  return publicId?.trim() ?? ''
}
