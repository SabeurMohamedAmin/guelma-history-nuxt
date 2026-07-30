<script setup lang="ts">
import { ref } from 'vue'
import { useArticleFormStore } from '~/stores/articleFormStore'
import { useMediaUpload } from '~/composables/useMediaUpload'

const store = useArticleFormStore()
const { t } = useI18n()

// Cover image upload: reuses the same Cloudinary endpoint as the gallery, but
// restricted to images. The returned CDN URL is written into `coverImage`,
// which stays a plain URL string (upload OR manual URL, both supported).
const { uploading: coverUploading, error: coverError, upload: uploadCover } = useMediaUpload()
const coverInput = ref<HTMLInputElement | null>(null)

function openCoverPicker() {
  coverInput.value?.click()
}

async function onCoverSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // allow re-picking the same file
  if (!file) return

  store.beginMediaUpload()
  let result
  try {
    result = await uploadCover(file)
  }
  finally {
    store.endMediaUpload()
  }

  if (result) {
    store.fields.coverImage = result.url
    store.fields.coverImageVariants = result.imageVariants
  }
}

// ─── Reading time control ───────────────────────────────────────────────────
// Small, friendly stepper around the raw number field, plus a few quick picks.
const READING_TIME_MIN = 0
const READING_TIME_MAX = 12
const READING_TIME_PRESETS = [2, 5, 8, 12] as const

const readingTime = computed<number>({
  get: () => store.fields.readingTime ?? 0,
  set: (value) => {
    if (!Number.isFinite(value) || value <= 0) {
      store.fields.readingTime = null
      return
    }
    // Clamp to the allowed range so the value never exceeds the max.
    store.fields.readingTime = Math.min(READING_TIME_MAX, Math.round(value))
  },
})

function stepReadingTime(delta: number) {
  readingTime.value = Math.min(
    READING_TIME_MAX,
    Math.max(READING_TIME_MIN, readingTime.value + delta),
  )
}
</script>

<template>
  <v-col
    cols="12"
    md="4"
  >
    <!-- Publication -->
    <v-card
      rounded="xl"
      elevation="0"
      class="editor-card mb-4 pa-2 px-md-4 py-3 py-md-4"
    >
      <div class="d-flex align-center ga-3">
        <div class="card-icon">
          <v-icon icon="mdi-cog-outline" />
        </div>
        <div class="text-subtitle-1 font-weight-bold">
          {{ t('articleForm.publishing') }}
        </div>
      </div>
      <v-card-text class="pa-0 pt-4 d-flex flex-column ga-4">
        <v-select
          v-model="store.fields.categoryId"
          :items="store.categories"
          item-title="nameFr"
          item-value="id"
          :label="t('articleForm.category')"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-shape-outline"
          clearable
        />
        <v-select
          v-model="store.fields.authorId"
          :items="store.authors"
          item-title="name"
          item-value="id"
          :label="t('articleForm.author')"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-account-outline"
          clearable
        />

        <!-- Publish status -->
        <div
          class="status-row d-flex align-center ga-3 pa-3 rounded-lg"
          :class="store.isPublished ? 'status-row--on' : 'status-row--off'"
        >
          <v-icon
            :icon="store.isPublished ? 'mdi-earth' : 'mdi-clock-outline'"
            :color="store.isPublished ? 'success' : 'medium-emphasis'"
          />
          <div class="flex-grow-1">
            <div class="text-body-2 font-weight-medium">
              {{ store.isPublished ? t('articleForm.statusPublished') : t('articleForm.statusPending') }}
            </div>
          </div>
          <v-switch
            v-model="store.isPublished"
            color="success"
            density="compact"
            hide-details
            inset
          />
        </div>

        <v-text-field
          v-model="store.fields.publishedAt"
          :label="t('articleForm.publishDate')"
          type="datetime-local"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-calendar-clock"
          :hint="t('articleForm.publishDateHint')"
          persistent-hint
        />
      </v-card-text>
    </v-card>

    <!-- Cover image -->
    <v-card
      rounded="xl"
      elevation="0"
      class="editor-card mb-4 pa-2 px-md-4 py-3 py-md-4"
    >
      <div class="d-flex align-center ga-3">
        <div class="card-icon">
          <v-icon icon="mdi-image-outline" />
        </div>
        <div class="flex-grow-1">
          <div class="text-subtitle-1 font-weight-bold">
            {{ t('articleForm.coverImage') }}
          </div>
        </div>
        <v-chip
          size="x-small"
          variant="tonal"
          color="medium-emphasis"
        >
          {{ t('articleForm.optional') }}
        </v-chip>
      </div>
      <v-card-text class="pa-0 py-3">
        <!-- Preview / dropzone -->
        <div
          v-if="store.fields.coverImage"
          class="cover-frame rounded-lg mb-3"
        >
          <NuxtImg
            :src="store.fields.coverImage"
            width="400"
            height="225"
            fit="cover"
            loading="eager"
            sizes="sm:100vw md:400px"
            class="cover-preview"
          />
          <v-btn
            icon="mdi-delete-outline"
            size="small"
            color="error"
            variant="flat"
            class="cover-remove"
            @click="store.fields.coverImage = ''; store.fields.coverImageVariants = null"
          />
        </div>
        <button
          v-else
          type="button"
          class="cover-dropzone rounded-lg mb-3 d-flex flex-column align-center justify-center ga-1"
          :disabled="coverUploading"
          @click="openCoverPicker"
        >
          <v-progress-circular
            v-if="coverUploading"
            indeterminate
            color="primary"
            size="28"
          />
          <template v-else>
            <v-icon
              icon="mdi-cloud-upload-outline"
              size="32"
              color="primary"
            />
            <span class="text-body-2 font-weight-medium">{{ t('articleForm.coverUpload') }}</span>
            <span class="text-caption text-medium-emphasis">{{ t('articleForm.coverUploadHint') }}</span>
          </template>
        </button>

        <v-alert
          v-if="coverError"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-3"
          :text="coverError"
        />

        <input
          ref="coverInput"
          type="file"
          accept="image/*"
          class="d-none"
          @change="onCoverSelected"
        />

        <v-text-field
          v-model="store.fields.coverImage"
          :label="t('articleForm.imageUrl')"
          placeholder="https://…"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-link-variant"
          clearable
          hide-details
        />
      </v-card-text>
    </v-card>

    <!-- Reading time -->
    <v-card
      rounded="xl"
      elevation="0"
      class="editor-card mb-4 pa-2 px-md-4 py-3 py-md-4"
    >
      <div class="d-flex align-center ga-3">
        <div class="card-icon">
          <v-icon icon="mdi-clock-time-four-outline" />
        </div>
        <div class="text-subtitle-1 font-weight-bold">
          {{ t('articleForm.readingTime') }}
        </div>
      </div>
      <v-card-text class="pa-0pt-4">
        <!-- Stepper -->
        <div class="reading-stepper d-flex align-baseline justify-center ga-4 mb-3">
          <v-btn
            icon="mdi-minus"
            variant="tonal"
            size="small"
            :disabled="readingTime <= 0"
            @click="stepReadingTime(-1)"
          />
          <div class="text-center">
            <div class="reading-value font-weight-bold">
              {{ readingTime || '—' }}
            </div>
            <div class="text-caption text-medium-emphasis">
              {{ t('article.min') }}
            </div>
          </div>
          <v-btn
            icon="mdi-plus"
            variant="tonal"
            size="small"
            :disabled="readingTime >= READING_TIME_MAX"
            @click="stepReadingTime(1)"
          />
        </div>

        <!-- Quick picks -->
        <div class="d-flex flex-wrap justify-center ga-2">
          <v-chip
            v-for="preset in READING_TIME_PRESETS"
            :key="preset"
            size="small"
            :variant="readingTime === preset ? 'flat' : 'tonal'"
            :color="readingTime === preset ? 'primary' : undefined"
            @click="readingTime = preset"
          >
            {{ preset }} {{ t('article.min') }}
          </v-chip>
        </div>
      </v-card-text>
    </v-card>

    <!-- Actions -->
    <div class="form-actions sidebar rounded-xl mb-4 pa-2 px-md-4 py-3 py-md-4 d-flex flex-column ga-2">
      <v-btn
        color="primary"
        variant="flat"
        block
        size="large"
        rounded="xl"
        :loading="store.loading || store.isUploadingMedia"
        :disabled="store.isUploadingMedia"
        prepend-icon="mdi-check"
        @click="store.submit"
      >
        {{ store.isUploadingMedia ? t('articleForm.media.uploadingWait') : t('articleForm.publish') }}
      </v-btn>
      <p class="text-body-small text-disabled text-start text-medium-emphasis px-2 mt-1 mb-0">
        {{ t('articleForm.media.uploadingHint') }}
      </p>
      <v-btn
        block
        color="warning"
        variant="text"
        rounded="xl"
        :to="store.listPath"
        :disabled="store.loading"
      >
        {{ t('articleForm.discard') }}
      </v-btn>
    </div>
  </v-col>
</template>

<style scoped>
.editor-card {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgb(var(--v-theme-surface));
  transition: box-shadow 0.2s ease;
}

.editor-card:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.06);
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 12px;
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
  flex-shrink: 0;
}

/* Publish status row */
.status-row {
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.status-row--on {
  background: rgba(var(--v-theme-success), 0.08);
  border-color: rgba(var(--v-theme-success), 0.25);
}

.status-row--off {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-color: rgba(var(--v-theme-on-surface), 0.08);
}

/* Cover image */
.cover-frame {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.cover-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-remove {
  position: absolute;
  top: 8px;
  inset-inline-end: 8px;
}

.cover-dropzone {
  width: 100%;
  aspect-ratio: 16 / 9;
  border: 2px dashed rgba(var(--v-theme-primary), 0.35);
  background: rgba(var(--v-theme-primary), 0.04);
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  padding: 8px;
}

.cover-dropzone:hover:not(:disabled) {
  border-color: rgb(var(--v-theme-primary));
  background: rgba(var(--v-theme-primary), 0.08);
}

.cover-dropzone:disabled {
  cursor: default;
}

/* Reading time stepper */
.reading-value {
  font-size: 2rem;
  line-height: 1;
  color: rgb(var(--v-theme-primary));
}

/*
 * On small devices the sidebar stacks below the long content form, so the
 * primary actions would sit far down the page. Make them float at the top while
 * scrolling so Save / Cancel are always reachable. On md and up the sidebar is
 * a normal column, so the actions stay in regular flow.
 */
@media (max-width: 959px) {
  .form-actions {
    top: 12px;
    z-index: 5;
    background: rgba(var(--v-theme-surface), 0.85);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }
}

@media (min-width: 840px) {
  .sidebar {
    position: sticky !important;
    top: 80px;
  }
}
</style>
