import { ref } from 'vue'
import type { Ref } from 'vue'

/**
 * Client helper for uploading a gallery media file (image or video) to
 * Cloudinary via our server endpoint.
 *
 * The endpoint does the heavy lifting with the server-only API secret and
 * returns the CDN URL plus a detected type and (for videos) a poster URL.
 * The composable only owns the in-flight / error state; the caller decides
 * how to apply the returned URL to the form item.
 */

export interface MediaUploadResult {
  url: string
  type: 'image' | 'video'
  posterUrl: string | null
  publicId: string
  /**
   * Cloudinary resource_type of the stored asset. Persisted with the gallery
   * item so a later delete targets the exact resource instead of guessing.
   */
  resourceType: 'image' | 'video'
}

/** Native file input accept attribute: any image or video. */
export const MEDIA_ACCEPT_ATTR = 'image/*,video/*'

export function useMediaUpload() {
  const uploading: Ref<boolean> = ref(false)
  const error: Ref<string | null> = ref(null)

  async function upload(file: File): Promise<MediaUploadResult | null> {
    error.value = null
    uploading.value = true

    try {
      const body = new FormData()
      body.append('file', file)

      const result = await $fetch<MediaUploadResult>('/api/admin/articles/media/upload', {
        method: 'POST',
        body,
      })
      return result
    }
    catch (err: unknown) {
      const apiError = err as { data?: { message?: string } }
      error.value = apiError?.data?.message || 'Upload failed.'
      return null
    }
    finally {
      uploading.value = false
    }
  }

  return { uploading, error, upload }
}
