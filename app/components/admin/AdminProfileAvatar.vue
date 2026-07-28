<script setup lang="ts">
/**
 * Profile avatar wrapper.
 *
 * Derives the avatar URL and initials from the admin's profile flags and
 * delegates picking/validation/preview to `AdminAvatarUploader`. It stays
 * presentational and re-emits the confirmed file; the parent performs the
 * upload through the profile API.
 */
const props = defineProps<{
  displayName: string | null
  username: string
  hasAvatar: boolean
  avatarUpdatedAt: string | null
  uploading?: boolean
}>()

const emit = defineEmits<{ change: [file: File] }>()

const { initials, avatarUrl } = useAdminAvatar(
  () => props.displayName,
  () => props.username,
  () => props.hasAvatar,
  () => props.avatarUpdatedAt,
)

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
