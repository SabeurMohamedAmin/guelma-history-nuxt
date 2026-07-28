<script setup lang="ts">
/**
 * Article media gallery editor.
 *
 * Lets an admin build the article's gallery from multiple items: uploaded
 * image/video files (stored on Cloudinary), manual media URLs, or YouTube
 * links. Each item has an optional poster (useful for videos) and bilingual
 * captions. Items can be reordered and removed; the order here is the order
 * shown on the public article page.
 *
 * Uploads go to Cloudinary via /api/admin/articles/media/upload (server-side,
 * the API secret never reaches the client). The returned CDN URL is written
 * straight into the item's `url`, so the existing payload/schema is unchanged.
 *
 * State lives in the shared article form store, so this component stays a thin,
 * easy-to-read view over `store.fields.media`.
 */
import { useArticleFormStore } from '~/stores/articleFormStore'
import { MEDIA_ACCEPT_ATTR, useMediaUpload } from '~/composables/useMediaUpload'

const store = useArticleFormStore()
const { t } = useI18n()
const { uploading, error: uploadError, upload } = useMediaUpload()

const typeOptions = computed(() => [
  { value: 'image', title: t('articleForm.media.typeImage'), icon: 'mdi-image-outline' },
  { value: 'video', title: t('articleForm.media.typeVideo'), icon: 'mdi-video-outline' },
  { value: 'youtube', title: t('articleForm.media.typeYoutube'), icon: 'mdi-youtube' },
])

function iconForType(type: string) {
  return typeOptions.value.find(option => option.value === type)?.icon ?? 'mdi-image-outline'
}

// One hidden file input per row; index of the row whose upload is in flight.
const fileInputs = ref<Record<number, HTMLInputElement | null>>({})
const uploadingIndex = ref<number | null>(null)

// Vue types a function ref as `Element | ComponentPublicInstance | null`. This
// ref always points at a plain <input type="file">, so narrow it once here.
function setFileInput(index: number, el: unknown) {
  fileInputs.value[index] = (el as HTMLInputElement | null) ?? null
}

function openPicker(index: number) {
  fileInputs.value[index]?.click()
}

async function onFileSelected(event: Event, index: number) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // allow re-picking the same file
  if (!file) return

  uploadingIndex.value = index
  store.beginMediaUpload()
  let result
  try {
    result = await upload(file)
  }
  finally {
    store.endMediaUpload()
    uploadingIndex.value = null
  }

  const item = store.fields.media[index]
  if (!result || !item) return

  item.url = result.url
  item.publicId = result.publicId
  item.resourceType = result.resourceType
  item.type = result.type
  if (result.posterUrl && !item.posterUrl) item.posterUrl = result.posterUrl
}
</script>

<template>
  <v-card
    variant="flat"
    class="mb-4 rounded-lg"
  >
    <v-card-title class="d-flex align-center pa-4 pb-2">
      <span class="text-subtitle-1 font-weight-medium">{{ t('articleForm.media.title') }}</span>
      <span class="text-caption text-medium-emphasis font-weight-regular ml-2">{{ t('articleForm.optional') }}</span>
      <v-spacer />
      <v-chip
        size="small"
        variant="tonal"
        color="primary"
      >
        {{ store.fields.media.length }}
      </v-chip>
    </v-card-title>

    <v-card-text class="pt-2">
      <p class="text-caption text-medium-emphasis mb-3">
        {{ t('articleForm.media.hint') }}
      </p>

      <v-alert
        v-if="uploadError"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-3"
        :text="uploadError"
      />

      <div
        v-if="!store.fields.media.length"
        class="media-empty d-flex flex-column align-center justify-center text-center pa-8 mb-3 rounded-lg"
      >
        <v-icon
          icon="mdi-image-multiple-outline"
          size="40"
          class="text-medium-emphasis mb-2"
        />
        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ t('articleForm.media.hint') }}
        </p>
      </div>

      <v-expansion-panels
        v-if="store.fields.media.length"
        variant="accordion"
        class="media-panels mb-3"
      >
        <v-expansion-panel
          v-for="(item, index) in store.fields.media"
          :key="index"
          class="media-panel"
        >
          <v-expansion-panel-title>
            <div class="d-flex align-center ga-3 w-100">
              <div class="media-thumb d-flex align-center justify-center rounded-lg flex-shrink-0">
                <v-img
                  v-if="item.type !== 'youtube' && item.posterUrl || (item.type === 'image' && item.url)"
                  :src="item.type === 'image' ? item.url : item.posterUrl"
                  width="48"
                  height="48"
                  cover
                  class="media-thumb-img rounded-lg"
                >
                  <template #error>
                    <v-icon
                      :icon="iconForType(item.type)"
                      size="small"
                      class="text-medium-emphasis"
                    />
                  </template>
                </v-img>
                <v-icon
                  v-else
                  :icon="iconForType(item.type)"
                  size="small"
                  class="text-medium-emphasis"
                />
              </div>
              <span class="text-body-2 font-weight-medium">{{ t('media.item') }} {{ index + 1 }}</span>
              <v-spacer />
              <v-chip
                size="x-small"
                variant="tonal"
                class="me-2 text-capitalize"
              >
                {{ item.type }}
              </v-chip>
            </div>
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <v-select
              v-model="item.type"
              :items="typeOptions"
              :label="t('articleForm.media.type')"
              variant="outlined"
              density="comfortable"
              class="mb-3"
              hide-details
            />

            <!-- Cloudinary upload (images & videos only; YouTube is link-only). -->
            <template v-if="item.type !== 'youtube'">
              <v-btn
                block
                variant="tonal"
                color="primary"
                prepend-icon="mdi-cloud-upload-outline"
                class="mb-2"
                :loading="uploading && uploadingIndex === index"
                :disabled="uploading"
                @click="openPicker(index)"
              >
                {{ t('articleForm.media.upload') }}
              </v-btn>
              <input
                :ref="el => setFileInput(index, el)"
                type="file"
                :accept="MEDIA_ACCEPT_ATTR"
                class="d-none"
                @change="event => onFileSelected(event, index)"
              />
              <p class="text-caption text-medium-emphasis mb-3">
                {{ t('articleForm.media.uploadHint') }}
              </p>
            </template>

            <v-text-field
              v-model="item.url"
              :label="item.type === 'youtube' ? t('articleForm.media.youtubeUrl') : t('articleForm.media.url')"
              :placeholder="item.type === 'youtube' ? 'https://youtube.com/watch?v=…' : 'https://…'"
              variant="outlined"
              density="comfortable"
              :prepend-inner-icon="iconForType(item.type)"
              class="mb-3"
              hide-details="auto"
            />

            <v-text-field
              v-if="item.type !== 'image'"
              v-model="item.posterUrl"
              :label="t('articleForm.media.poster')"
              placeholder="https://…"
              variant="outlined"
              density="comfortable"
              prepend-inner-icon="mdi-image-multiple-outline"
              class="mb-3"
              hide-details
            />

            <v-text-field
              v-model="item.captionFr"
              :label="t('articleForm.media.captionFr')"
              variant="outlined"
              density="comfortable"
              class="mb-3"
              hide-details
            />

            <v-text-field
              v-model="item.captionAr"
              :label="t('articleForm.media.captionAr')"
              variant="outlined"
              density="comfortable"
              dir="rtl"
              class="mb-3"
              hide-details
            />

            <div class="d-flex align-center ga-1">
              <v-btn
                icon="mdi-arrow-up"
                variant="text"
                size="small"
                :disabled="index === 0"
                :aria-label="t('articleForm.media.moveUp')"
                @click="store.moveMedia(index, -1)"
              />
              <v-btn
                icon="mdi-arrow-down"
                variant="text"
                size="small"
                :disabled="index === store.fields.media.length - 1"
                :aria-label="t('articleForm.media.moveDown')"
                @click="store.moveMedia(index, 1)"
              />
              <v-spacer />
              <v-btn
                icon="mdi-delete-outline"
                variant="text"
                size="small"
                color="error"
                :aria-label="t('common.delete')"
                @click="store.removeMedia(index)"
              />
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <v-btn
        block
        variant="tonal"
        color="primary"
        prepend-icon="mdi-plus"
        @click="store.addMedia('image')"
      >
        {{ t('articleForm.media.add') }}
      </v-btn>
    </v-card-text>
  </v-card>
</template>

<style scoped>
.media-empty {
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.18);
  background: rgba(var(--v-theme-on-surface), 0.02);
  transition: border-color 0.25s ease, background-color 0.25s ease;
}

.media-empty:hover {
  border-color: rgba(var(--v-theme-primary), 0.4);
  background: rgba(var(--v-theme-primary), 0.04);
}

.media-panels {
  border-radius: 12px;
}

.media-panel {
  transition: box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.media-panel:hover {
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.08);
}

.media-thumb {
  width: 40px;
  height: 40px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  overflow: hidden;
}

.media-thumb-img {
  width: 40px;
  height: 40px;
  object-fit: cover;
}

@media (max-width: 600px) {
  .media-empty {
    padding: 1.5rem !important;
  }

  .media-thumb,
  .media-thumb-img {
    width: 32px;
    height: 32px;
  }

  /* Drop hover shadow on touch devices to avoid sticky states. */
  .media-panel:hover {
    box-shadow: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .media-empty,
  .media-panel {
    transition: none;
  }
}
</style>
