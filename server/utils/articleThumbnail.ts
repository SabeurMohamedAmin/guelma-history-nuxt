import type { ImageVariants } from '~~/shared/types/article'

/**
 * Cover image resolution for list views.
 *
 * List rows must never download a full size cover image. Articles uploaded
 * through the web admin already store a generated `thumbnail` variant, so that
 * is always preferred. Rows saved before variants existed keep only a plain
 * `coverImage` URL, so a Cloudinary delivery URL gets an on-the-fly
 * transformation instead. Any other host is returned untouched, because we
 * cannot know how to resize it.
 */

/** Marker that identifies a Cloudinary image delivery URL. */
const CLOUDINARY_UPLOAD_SEGMENT = '/image/upload/'

/**
 * Square crop wide enough for a retina list row, with automatic format and
 * quality so Cloudinary serves WebP or AVIF where the client supports it.
 */
const THUMBNAIL_TRANSFORMATION = 'c_fill,w_200,h_200,f_auto,q_auto'

/**
 * Return the smallest usable cover image, or null when the article has none.
 *
 * @param coverImage Plain cover image URL stored on the article row.
 * @param variants Generated variants stored at upload time, when available.
 */
export function resolveArticleThumbnail(
  coverImage: string | null,
  variants: ImageVariants | null,
): string | null {
  const storedThumbnail = variants?.thumbnail?.trim()
  if (storedThumbnail) return storedThumbnail

  const url = coverImage?.trim()
  if (!url) return null

  const segmentIndex = url.indexOf(CLOUDINARY_UPLOAD_SEGMENT)
  if (segmentIndex === -1) return url

  const insertAt = segmentIndex + CLOUDINARY_UPLOAD_SEGMENT.length
  return `${url.slice(0, insertAt)}${THUMBNAIL_TRANSFORMATION}/${url.slice(insertAt)}`
}
