<script setup lang="ts">
/**
 * User profile avatar wrapper.
 *
 * Same role as `AdminProfileAvatar` but for regular users: it derives the
 * initials placeholder and the database-backed avatar URL (served by the
 * authenticated `/api/auth/user/avatar` endpoint), then delegates the
 * picking/preview/upload UI to the shared `AdminAvatarUploader`. It stays
 * presentational and re-emits the confirmed file; the page performs the upload.
 */
const props = defineProps<{
  displayName: string | null
  username: string
  hasAvatar: boolean
  avatarUpdatedAt: string | null
  uploading?: boolean
}>()

const emit = defineEmits<{ change: [file: File] }>()

const name = computed(() => props.displayName?.trim() || props.username.trim() || '')

const initials = computed(() => {
  const parts = name.value.split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
})

// Database-backed avatar, versioned so a new upload busts the browser cache.
const avatarUrl = computed(() => {
  if (!props.hasAvatar) return null
  const query = props.avatarUpdatedAt ? `?v=${encodeURIComponent(props.avatarUpdatedAt)}` : ''
  return `/api/auth/user/avatar${query}`
})

const altText = computed(() => props.displayName ?? props.username)
</script>

<template>
  <admin-avatar-uploader
    :current-url="avatarUrl"
    :initials="initials"
    :alt="altText"
    :uploading="uploading"
    @change="emit('change', $event)"
  />
</template>
