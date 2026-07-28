<script setup lang="ts">
import { reactive, ref, computed, onUnmounted } from 'vue'

const { t } = useI18n()

/* ================= constants ================= */
const MAX_TOTAL_FILE_BYTES = 50 * 1024 * 1024 // 50 MB
const MAX_FILE_COUNT = 5
const ACCEPTED_FILE_TYPES = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z'
const BLOCKED_EXTENSIONS = [
  '.apk', '.app', '.bat', '.bin', '.cmd', '.com',
  '.dll', '.dmg', '.exe', '.jar', '.msi', '.scr', '.sh',
]

/* ================= form state ================= */
const form = reactive({
  name: '',
  email: '',
  message: '',
})

const loading = ref(false)
const sent = ref(false)
const errorMessage = ref('')
const files = ref<File[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

/* ================= image preview cache (no memory leaks) ================= */
const previewUrls = new Map<string, string>()

function getFileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`
}

function getPreview(file: File): string | null {
  if (!file.type.startsWith('image/')) return null
  const key = getFileKey(file)
  if (!previewUrls.has(key)) {
    previewUrls.set(key, URL.createObjectURL(file))
  }
  return previewUrls.get(key) ?? null
}

function deletePreviewUrl(key: string): void {
  previewUrls.delete(key)
}

function revokePreview(file: File): void {
  const key = getFileKey(file)
  const url = previewUrls.get(key)
  if (url) {
    URL.revokeObjectURL(url)
    deletePreviewUrl(key)
  }
}

function revokeAllPreviews(): void {
  previewUrls.forEach(url => URL.revokeObjectURL(url))
  previewUrls.clear()
}

onUnmounted(revokeAllPreviews)

/* ================= validation ================= */
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const rules = {
  required: (v: string) =>
    (!!v && v.trim().length > 0) || t('contact.errors.required'),
  email: (v: string) => emailRe.test(v.trim()) || t('contact.errors.email'),
  minMessage: (v: string) =>
    (!!v && v.trim().length >= 10) || t('contact.errors.message'),
}

const totalFileBytes = computed(() =>
  files.value.reduce((sum, f) => sum + f.size, 0),
)
const totalFileMegabytes = computed(() =>
  (totalFileBytes.value / 1024 / 1024).toFixed(1),
)
const hasInvalidFiles = computed(() => files.value.some(isBlockedFile))
const hasTooManyFiles = computed(() => files.value.length > MAX_FILE_COUNT)
const hasOversizedTotal = computed(() => totalFileBytes.value > MAX_TOTAL_FILE_BYTES)

const valid = computed(() =>
  form.name.trim().length >= 2
  && emailRe.test(form.email.trim())
  && form.message.trim().length >= 10
  && !hasTooManyFiles.value
  && !hasOversizedTotal.value
  && !hasInvalidFiles.value,
)

const canAddMore = computed(() => files.value.length < MAX_FILE_COUNT)

// Fraction of the total size quota used (0–1), drives the progress bar.
const sizeUsedRatio = computed(() =>
  Math.min(totalFileBytes.value / MAX_TOTAL_FILE_BYTES, 1),
)

/* ================= file helpers ================= */
function isBlockedFile(file: File): boolean {
  const lowerName = file.name.toLowerCase()
  return BLOCKED_EXTENSIONS.some(ext => lowerName.endsWith(ext))
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function getFileIcon(file: File): string {
  const name = file.name.toLowerCase()
  if (file.type.startsWith('image/')) return 'mdi-file-image-outline'
  if (file.type === 'application/pdf') return 'mdi-file-pdf-box'
  if (file.type.includes('word') || name.endsWith('.doc') || name.endsWith('.docx'))
    return 'mdi-file-word-outline'
  if (file.type.includes('excel') || name.endsWith('.xls') || name.endsWith('.xlsx'))
    return 'mdi-file-excel-outline'
  if (file.type.includes('zip') || ['.zip', '.rar', '.7z'].some(ext => name.endsWith(ext)))
    return 'mdi-folder-zip-outline'
  return 'mdi-file-document-outline'
}

/* ================= file operations ================= */
// Shared logic for both the file picker and drag-and-drop.
function addFiles(selected: File[]): void {
  if (!selected.length) return
  errorMessage.value = ''

  // 1. blocked extension check
  if (selected.some(isBlockedFile)) {
    errorMessage.value = t('contact.errors.filesType')
    return
  }

  // 2. count check
  if (files.value.length + selected.length > MAX_FILE_COUNT) {
    errorMessage.value = t('contact.errors.filesCount', { count: MAX_FILE_COUNT })
    return
  }

  // 3. total size check
  const addedSize = selected.reduce((sum, f) => sum + f.size, 0)
  if (totalFileBytes.value + addedSize > MAX_TOTAL_FILE_BYTES) {
    errorMessage.value = t('contact.errors.filesSize', { size: '50' })
    return
  }

  files.value.push(...selected)
}

function onFileInputChange(event: Event): void {
  const input = event.target as HTMLInputElement
  if (input.files?.length) {
    addFiles(Array.from(input.files))
  }
  input.value = '' // reset so the same file can be picked again after removal
}

function onDrop(event: DragEvent): void {
  isDragging.value = false
  if (!canAddMore.value) return
  const dropped = event.dataTransfer?.files
  if (dropped?.length) {
    addFiles(Array.from(dropped))
  }
}

function openFilePicker(): void {
  fileInput.value?.click()
}

function removeFile(index: number): void {
  const file = files.value[index]
  if (file) revokePreview(file)
  files.value.splice(index, 1)
}

function clearFiles(): void {
  files.value.forEach(revokePreview)
  files.value = []
}

/* ================= submit ================= */
async function submit(): Promise<void> {
  if (!valid.value || loading.value) return

  loading.value = true
  errorMessage.value = ''

  const body = new FormData()
  body.append('name', form.name.trim())
  body.append('email', form.email.trim().toLowerCase())
  body.append('message', form.message.trim())
  files.value.forEach(file => body.append('files', file))

  try {
    await $fetch('/api/contact/submit', {
      method: 'POST',
      body,
    })
    sent.value = true
    clearFiles()
  }
  catch (error: unknown) {
    const e = error as {
      data?: { message?: string, statusMessage?: string }
      message?: string
    }
    errorMessage.value
      = e?.data?.message
        || e?.data?.statusMessage
        || e?.message
        || t('contact.errors.generic')
  }
  finally {
    loading.value = false
  }
}

function reset(): void {
  form.name = ''
  form.email = ''
  form.message = ''
  clearFiles()
  sent.value = false
  errorMessage.value = ''
}
</script>

<template>
  <v-sheet
    class="rounded-xl pa-4 pa-md-6"
    color="surface"
    border
  >
    <!-- ============ Success state ============ -->
    <div
      v-if="sent"
      class="text-center py-8"
    >
      <v-avatar
        color="warning"
        variant="tonal"
        size="72"
        class="mb-4"
      >
        <v-icon
          icon="mdi-email-arrow-left"
          size="40"
        />
      </v-avatar>
      <h2 class="text-headline-small font-weight-bold mb-2">
        {{ t('contact.verifySentTitle') }}
      </h2>
      <p
        class="text-body-1 text-medium-emphasis mb-6 mx-auto"
        style="max-width: 420px;"
      >
        {{ t('contact.verifySentBody') }}
      </p>
      <v-btn
        variant="tonal"
        color="primary"
        prepend-icon="mdi-email-edit-outline"
        @click="reset"
      >
        {{ t('contact.sendAnother') }}
      </v-btn>
    </div>

    <!-- ============ Form state ============ -->
    <v-form
      v-else
      @submit.prevent="submit"
    >
      <v-text-field
        v-model="form.name"
        :label="t('contact.name')"
        :rules="[rules.required]"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-account-outline"
        class="mb-2"
      />
      <v-text-field
        v-model="form.email"
        :label="t('contact.email')"
        :rules="[rules.required, rules.email]"
        type="email"
        variant="outlined"
        density="comfortable"
        prepend-inner-icon="mdi-email-outline"
        class="mb-2"
      />
      <v-textarea
        v-model="form.message"
        :label="t('contact.message')"
        :rules="[rules.required, rules.minMessage]"
        variant="outlined"
        rows="5"
        auto-grow
        prepend-inner-icon="mdi-message-text-outline"
        class="mb-2"
      />

      <!-- ============ Attachments ============ -->
      <input
        ref="fileInput"
        type="file"
        multiple
        :accept="ACCEPTED_FILE_TYPES"
        class="d-none"
        @change="onFileInputChange"
      />

      <!-- Drop zone -->
      <v-sheet
        class="dropzone d-flex flex-column align-center justify-center text-center rounded-lg pa-6 mb-3"
        :class="{ 'dropzone--active': isDragging, 'dropzone--disabled': !canAddMore }"
        :color="isDragging ? 'primary' : 'transparent'"
        border
        role="button"
        tabindex="0"
        @click="canAddMore && openFilePicker()"
        @keydown.enter.prevent="canAddMore && openFilePicker()"
        @keydown.space.prevent="canAddMore && openFilePicker()"
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="onDrop"
      >
        <v-icon
          icon="mdi-cloud-upload-outline"
          size="40"
          :color="isDragging ? 'primary' : 'medium-emphasis'"
          class="mb-2"
        />
        <span class="text-body-2 font-weight-medium">
          {{ t('contact.addFiles') }}
        </span>
        <span class="text-caption text-medium-emphasis">
          {{ t('contact.filesHint') }}
        </span>
      </v-sheet>

      <!-- Quota: count + total size -->
      <div class="d-flex align-center justify-space-between text-caption text-medium-emphasis mb-1">
        <span>{{ files.length }} / {{ MAX_FILE_COUNT }}</span>
        <span>{{ totalFileMegabytes }} / 50 MB</span>
      </div>
      <v-progress-linear
        :model-value="sizeUsedRatio * 100"
        :color="hasOversizedTotal ? 'error' : 'primary'"
        height="4"
        rounded
        class="mb-4"
      />

      <!-- Selected files -->
      <v-row
        v-if="files.length"
        density="compact"
        class="mb-2 slow-animation"
      >
        <v-col
          v-for="(file, index) in files"
          :key="getFileKey(file)"
          cols="6"
          sm="4"
        >
          <v-card
            :color="isBlockedFile(file) ? 'error' : undefined"
            :variant="isBlockedFile(file) ? 'tonal' : 'outlined'"
            class="h-100"
            rounded="lg"
          >
            <div
              class="d-flex align-center justify-center bg-surface-light"
              style="height: 88px;"
            >
              <v-img
                v-if="getPreview(file)"
                :src="getPreview(file)!"
                :alt="file.name"
                cover
                height="88"
                width="100%"
              />
              <v-icon
                v-else
                :icon="getFileIcon(file)"
                :color="isBlockedFile(file) ? 'error' : 'primary'"
                size="40"
              />
            </div>

            <div class="pa-2">
              <div
                class="text-caption font-weight-medium text-truncate"
                :title="file.name"
              >
                {{ file.name }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ formatFileSize(file.size) }}
              </div>
            </div>

            <v-btn
              icon="mdi-close"
              size="x-small"
              variant="flat"
              color="error"
              class="position-absolute"
              style="top: 4px; right: 4px;"
              :aria-label="`${t('common.delete')} ${file.name}`"
              @click.stop="removeFile(index)"
            />
          </v-card>
        </v-col>
      </v-row>

      <!-- ============ Validation / server alerts ============ -->
      <v-alert
        v-if="hasTooManyFiles"
        type="error"
        variant="tonal"
        density="compact"
      >
        {{ t('contact.errors.filesCount', { count: MAX_FILE_COUNT }) }}
      </v-alert>

      <v-alert
        v-if="hasOversizedTotal"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        {{ t('contact.errors.filesSize', { size: totalFileMegabytes }) }}
      </v-alert>

      <v-alert
        v-if="hasInvalidFiles"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-3"
      >
        {{ t('contact.errors.filesType') }}
      </v-alert>

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        {{ errorMessage }}
      </v-alert>

      <!-- ============ Submit ============ -->
      <v-btn
        type="submit"
        color="primary"
        size="large"
        block
        rounded="lg"
        class="font-weight-bold"
        prepend-icon="mdi-send-outline"
        :loading="loading"
        :disabled="!valid"
      >
        {{ t('contact.submit') }}
      </v-btn>

      <p class="text-caption text-medium-emphasis text-center mt-4 mb-0">
        {{ t('contact.verifyHint') }}
      </p>
    </v-form>
  </v-sheet>
</template>

<style scoped>
.dropzone {
  border-style: dashed !important;
  border-width: 2px !important;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.dropzone:hover {
  border-color: rgb(var(--v-theme-primary)) !important;
}

.dropzone--active {
  border-color: rgb(var(--v-theme-primary)) !important;
}

.dropzone--disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
