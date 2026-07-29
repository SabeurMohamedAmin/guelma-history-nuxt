import { v2 as cloudinary } from 'cloudinary'

/**
 * Cloudinary configuration + upload helper (server-only).
 *
 * Credentials are read from runtimeConfig (mapped from CLOUDINARY_* env vars in
 * nuxt.config.ts). The API secret never leaves the server: the browser sends
 * the raw file to our endpoint, which uploads to Cloudinary and returns the
 * resulting secure URL. Mirrors the avatar flow where bytes are processed
 * server-side.
 */

let configured = false

/** Lazily configure the SDK once, from runtimeConfig. Throws if not set up. */
function getClient() {
  if (!configured) {
    const config = useRuntimeConfig()
    const cloudName = config.cloudinaryCloudName
    const apiKey = config.cloudinaryApiKey
    const apiSecret = config.cloudinaryApiSecret

    if (!cloudName || !apiKey || !apiSecret) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Server Error',
        message: 'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
      })
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    })
    configured = true
  }

  return cloudinary
}

export interface CloudinaryUploadResult {
  /** Public, CDN-served URL stored in article_media.url. */
  url: string
  /** Cloudinary public id (keep it if you later delete the asset). */
  publicId: string
  /** 'image' | 'video' as classified by Cloudinary. */
  resourceType: string
  /** Generated poster (videos only): first-frame still as a JPG. */
  posterUrl: string | null
}

/** A single asset to remove from Cloudinary storage. */
export interface CloudinaryAsset {
  /** Cloudinary public id stored in article_media.public_id. */
  publicId: string
  /** Media type so we delete videos with the right resource_type. */
  type: string
}

/**
 * Permanently delete one asset from Cloudinary storage.
 *
 * Videos must be removed with `resource_type: 'video'`; everything else is an
 * image. Failures are logged but never thrown: cleaning up storage must not
 * block the database operation that triggered it (e.g. editing an article).
 */
export async function destroyFromCloudinary(asset: CloudinaryAsset): Promise<void> {
  const publicId = asset.publicId?.trim()
  if (!publicId) return

  const resourceType = asset.type === 'video' ? 'video' : 'image'

  try {
    const client = getClient()
    await client.uploader.destroy(publicId, { resource_type: resourceType })
  }
  catch (error) {
    // Storage cleanup is best-effort; surface the problem in logs only.
    console.error(`Failed to delete Cloudinary asset "${publicId}":`, error)
  }
}

/** Delete several Cloudinary assets, skipping items without a public id. */
export async function destroyManyFromCloudinary(assets: CloudinaryAsset[]): Promise<void> {
  const removable = assets.filter(asset => Boolean(asset.publicId?.trim()))
  if (removable.length === 0) return

  await Promise.all(removable.map(asset => destroyFromCloudinary(asset)))
}

/**
 * Upload a raw buffer to Cloudinary. `resource_type: 'auto'` lets Cloudinary
 * detect images vs videos. For videos we derive a poster URL (first frame as
 * JPG) so the gallery has a thumbnail without a manual poster.
 */
export async function uploadToCloudinary(
  data: Buffer,
  folder = 'articles',
  requestedPublicId?: string,
): Promise<CloudinaryUploadResult> {
  const client = getClient()

  const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
        ...(requestedPublicId ? { public_id: requestedPublicId } : {}),
      },
      (error, uploaded) => {
        if (error || !uploaded) {
          reject(error ?? new Error('Cloudinary upload failed.'))
          return
        }
        resolve(uploaded as unknown as Record<string, unknown>)
      },
    )
    stream.end(data)
  })

  const resourceType = String(result.resource_type ?? 'image')
  const secureUrl = String(result.secure_url ?? '')
  const publicId = String(result.public_id ?? '')

  const posterUrl
    = resourceType === 'video'
      ? client.url(publicId, { resource_type: 'video', format: 'jpg' })
      : null

  return { url: secureUrl, publicId, resourceType, posterUrl }
}
