import type { MaybeRefOrGetter } from 'vue'

/**
 * Derives avatar presentation from an admin's name/avatar flags.
 *
 * The avatar image itself is stored as a database blob and fetched through an
 * authenticated endpoint only when the profile has one.
 */
export function useAdminAvatar(
  displayName: MaybeRefOrGetter<string | null | undefined>,
  username: MaybeRefOrGetter<string | null | undefined>,
  hasAvatar: MaybeRefOrGetter<boolean | null | undefined>,
  avatarUpdatedAt?: MaybeRefOrGetter<string | null | undefined>,
) {
  const name = computed(() => toValue(displayName)?.trim() || toValue(username)?.trim() || '')

  const initials = computed(() => {
    const parts = name.value.split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  })

  const avatarUrl = computed(() => {
    if (!toValue(hasAvatar)) return null

    const version = toValue(avatarUpdatedAt)
    const query = version ? `?v=${encodeURIComponent(version)}` : ''
    return `/api/admin/profile/avatar${query}`
  })

  return { initials, avatarUrl }
}
