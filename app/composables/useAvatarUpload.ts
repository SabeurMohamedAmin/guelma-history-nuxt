import type { Ref } from 'vue'

/**
 * Client-side avatar upload helpers.
 *
 * The server normalizes every upload with sharp (square WebP), so there is no
 * size limit imposed on the user: large photos are downscaled automatically.
 * The only client-side guard is a light type check to reject obvious
 * non-images before the request; the composable also owns the object-URL
 * preview lifecycle and revokes it to avoid memory leaks.
 */

export const AVATAR_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/tiff',
] as const

/** Comma-separated list for the native file input `accept` attribute. */
export const AVATAR_ACCEPT_ATTR = 'image/*'

export type AvatarValidationError = 'type' | null

export interface AvatarSelection {
  file: File
  previewUrl: string
}

function isImage(file: File): boolean {
  // Trust the browser-provided type; accept anything it labels as an image.
  return file.type.startsWith('image/')
}

/**
 * Validates a file is an image. Returns `null` when valid, otherwise the
 * failing rule. Size is intentionally not checked: the server resizes it.
 */
export function validateAvatarFile(file: File): AvatarValidationError {
  return isImage(file) ? null : 'type'
}

/**
 * Manages a single in-progress avatar selection: validation, a revocable
 * preview URL and cleanup. The component drives it and reads the reactive
 * `selection` / `error` refs.
 */
export function useAvatarUpload() {
  const selection: Ref<AvatarSelection | null> = ref(null)
  const error: Ref<AvatarValidationError> = ref(null)

  function clear() {
    if (selection.value) URL.revokeObjectURL(selection.value.previewUrl)
    selection.value = null
    error.value = null
  }

  /**
   * Validates and stages a file for preview. Returns `true` when the file is
   * accepted, `false` otherwise (with `error` set to the failing rule).
   */
  function select(file: File): boolean {
    const validation = validateAvatarFile(file)
    if (validation) {
      clear()
      error.value = validation
      return false
    }

    clear()
    selection.value = { file, previewUrl: URL.createObjectURL(file) }
    return true
  }

  // Release the preview URL when the consuming component unmounts.
  onScopeDispose(clear)

  return { selection, error, select, clear }
}
