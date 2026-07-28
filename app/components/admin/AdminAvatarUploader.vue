<script setup lang="ts">
import { AVATAR_ACCEPT_ATTR, useAvatarUpload } from '~/composables/useAvatarUpload'

/**
 * Professional avatar uploader.
 *
 * Lets the admin pick an image by click or drag-and-drop, shows a live preview
 * and only emits `change` once the admin confirms. The server normalizes the
 * image with sharp, so there is no size limit on the user; the client only
 * rejects obvious non-image files.
 */
const props = defineProps<{
  /** Current avatar URL, shown until a new image is staged. */
  currentUrl: string | null
  /** Fallback initials when there is no avatar. */
  initials: string
  /** Alternative text for the avatar image. */
  alt: string
  /** Whether an upload request is in flight. */
  uploading?: boolean
}>()

const emit = defineEmits<{ change: [file: File] }>()

const { t } = useI18n()
const { selection, error, select, clear } = useAvatarUpload()

const fileInput = ref<HTMLInputElement | null>(null)
const dragging = ref(false)

// Show the staged preview when present, otherwise the saved avatar.
const displayUrl = computed(() => selection.value?.previewUrl ?? props.currentUrl)

const errorMessage = computed(() => (error.value === 'type' ? t('profile.avatarUploader.errorType') : ''))

function openPicker() {
  fileInput.value?.click()
}

function handleFile(file: File | undefined) {
  if (file) select(file)
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  handleFile(input.files?.[0])
  // Reset so picking the same file again still triggers the change event.
  input.value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  handleFile(event.dataTransfer?.files?.[0])
}

function confirm() {
  if (!selection.value) return
  emit('change', selection.value.file)
}

// Clear the staged preview once the upload has finished successfully.
watch(() => props.uploading, (isUploading, wasUploading) => {
  if (wasUploading && !isUploading) clear()
})
</script>

<template>
  <div class="text-center">
    <div
      class="avatar-dropzone d-inline-flex flex-column align-center pa-4 rounded-xl"
      :class="{ 'avatar-dropzone--active': dragging }"
      role="button"
      tabindex="0"
      :aria-label="t('profile.changeAvatar')"
      @click="openPicker"
      @keydown.enter.prevent="openPicker"
      @keydown.space.prevent="openPicker"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <div class="position-relative">
        <v-avatar
          size="120"
          color="primary"
          class="headline-medium"
        >
          <img
            v-if="displayUrl"
            :src="displayUrl"
            :alt="alt"
            class="avatar-image"
          />
          <span v-else>{{ initials }}</span>
        </v-avatar>

        <v-btn
          icon="mdi-camera"
          size="small"
          color="surface"
          variant="elevated"
          class="position-absolute"
          style="bottom: 0; inset-inline-end: 0;"
          :loading="uploading"
          :aria-label="t('profile.changeAvatar')"
          @click.stop="openPicker"
        />
      </div>

      <p class="text-caption text-medium-emphasis mt-3 mb-0">
        {{ t('profile.avatarUploader.hint') }}
      </p>

      <input
        ref="fileInput"
        type="file"
        :accept="AVATAR_ACCEPT_ATTR"
        class="d-none"
        @change="onFileSelected"
      />
    </div>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      density="compact"
      class="mt-3 text-start"
      :text="errorMessage"
    />

    <div
      v-if="selection"
      class="d-flex justify-center ga-2 mt-3"
    >
      <v-btn
        color="primary"
        variant="flat"
        size="small"
        prepend-icon="mdi-check"
        :loading="uploading"
        @click="confirm"
      >
        {{ t('profile.avatarUploader.save') }}
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        :disabled="uploading"
        @click="clear"
      >
        {{ t('common.cancel') }}
      </v-btn>
    </div>
  </div>
</template>

<style scoped>
.avatar-dropzone {
  border: 2px dashed transparent;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.avatar-dropzone:hover,
.avatar-dropzone:focus-visible {
  border-color: rgb(var(--v-theme-primary) / 0.4);
  outline: none;
}

.avatar-dropzone--active {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgb(var(--v-theme-primary) / 0.06);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
