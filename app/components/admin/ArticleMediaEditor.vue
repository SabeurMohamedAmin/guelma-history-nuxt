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
  item.imageVariants = result.imageVariants
  item.type = result.type
  if (result.posterUrl && !item.posterUrl) item.posterUrl = result.posterUrl
}
</script>

<template>
  <AdminFormCard
    icon="mdi-image-multiple-outline"
    :title="t('articleForm.media.title')"
    :hint="t('articleForm.media.hint')"
    optional
  >
    <template #actions>
      <v-chip
        size="small"
        variant="tonal"
        color="primary"
      >
        {{ store.fields.media.length }}
      </v-chip>
    </template>

    <v-alert
      v-if="uploadError"
      type="error"
      variant="tonal"
      density="compact"
      role="alert"
      class="mb-3"
      :text="uploadError"
    />

    <!-- Empty state -->
    <p
      v-if="!store.fields.media.length"
      class="media-empty d-flex flex-column align-center justify-center text-center text-body-2 text-medium-emphasis pa-6 mb-3 rounded-xl"
    >
      <v-icon
        icon="mdi-image-multiple-outline"
        size="40"
        class="mb-2"
        aria-hidden="true"
      />
      {{ t('articleForm.media.hint') }}
    </p>

    <v-expansion-panels
      v-if="store.fields.media.length"
      variant="accordion"
      class="mb-3"
    >
      <v-expansion-panel
        v-for="(item, index) in store.fields.media"
        :key="index"
      >
        <v-expansion-panel-title>
          <div class="d-flex align-center ga-3 w-100">
            <span class="media-thumb d-flex align-center justify-center rounded-lg flex-shrink-0">
              <v-img
                v-if="item.type !== 'youtube' && item.posterUrl || (item.type === 'image' && item.url)"
                :src="item.type === 'image' ? item.url : item.posterUrl"
                width="40"
                height="40"
                cover
                alt=""
                class="rounded-lg"
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
                aria-hidden="true"
              />
            </span>
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
              class="mb-2 rounded-xl text-none"
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
              tabindex="-1"
              :aria-label="t('articleForm.media.upload')"
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
              density="comfortable"
              :disabled="index === 0"
              :aria-label="t('articleForm.media.moveUp')"
              @click="store.moveMedia(index, -1)"
            />
            <v-btn
              icon="mdi-arrow-down"
              variant="text"
              density="comfortable"
              :disabled="index === store.fields.media.length - 1"
              :aria-label="t('articleForm.media.moveDown')"
              @click="store.moveMedia(index, 1)"
            />
            <v-spacer />
            <v-btn
              icon="mdi-delete-outline"
              variant="text"
              density="comfortable"
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
      class="rounded-xl text-none"
      prepend-icon="mdi-plus"
      @click="store.addMedia('image')"
    >
      {{ t('articleForm.media.add') }}
    </v-btn>
  </AdminFormCard>
</template>

<style scoped>
.media-empty {
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.18);
  background: rgba(var(--v-theme-on-surface), 0.02);
}

.media-thumb {
  inline-size: 40px;
  block-size: 40px;
  overflow: hidden;
  background: rgba(var(--v-theme-on-surface), 0.05);
}
</style>
