<script setup lang="ts">
/**
 * Right column of the article editor: the settings shared by every language —
 * category, author, publication state, cover image and reading time.
 *
 * Publish / Discard live in <AdminFormActionBar> so they exist only once and
 * stay reachable while scrolling.
 */
import { ref } from 'vue'
import { useArticleFormStore } from '~/stores/articleFormStore'
import { useMediaUpload } from '~/composables/useMediaUpload'

const store = useArticleFormStore()
const { t } = useI18n()
const { required } = useArticleFormRules()

/* ── Cover image ─────────────────────────────────────────────────────────── */
// Reuses the gallery's Cloudinary endpoint, restricted to images. The returned
// CDN URL is written into `coverImage`, which stays a plain URL string, so an
// upload and a pasted URL are interchangeable.
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

function removeCover() {
  store.fields.coverImage = ''
  store.fields.coverImageVariants = null
}

/* ── Reading time ────────────────────────────────────────────────────────── */
// A typable field between two steppers, plus a few quick picks. Typing matters:
// stepper-only controls are slow with a keyboard and hard with a screen reader.
const READING_TIME_MAX = 12
const READING_TIME_PRESETS = [2, 5, 8, 12] as const

const readingTime = computed<number>({
  get: () => store.fields.readingTime ?? 0,
  set: (value) => {
    if (!Number.isFinite(value) || value <= 0) {
      store.fields.readingTime = null
      return
    }
    // Clamp so the value can never exceed the allowed maximum.
    store.fields.readingTime = Math.min(READING_TIME_MAX, Math.round(value))
  },
})

function stepReadingTime(delta: number) {
  readingTime.value = Math.min(READING_TIME_MAX, Math.max(0, readingTime.value + delta))
}
</script>

<template>
  <v-col
    cols="12"
    md="4"
    class="editor-sidebar align-self-start"
  >
    <!-- Publication -->
    <AdminFormCard
      icon="mdi-cog-outline"
      :title="t('articleForm.publishing')"
    >
      <div class="d-flex flex-column ga-4">
        <v-select
          v-model="store.fields.categoryId"
          :items="store.categories"
          :label="t('articleForm.category')"
          item-title="nameFr"
          item-value="id"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-shape-outline"
          :rules="[required]"
          required
        />
        <v-select
          v-model="store.fields.authorId"
          :items="store.authors"
          :label="t('articleForm.author')"
          item-title="name"
          item-value="id"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-account-outline"
          clearable
        />

        <!-- Publish state. The switch label is the accessible name; the line
             below spells out what the current position means. -->
        <div
          class="status-row pa-3 rounded-lg"
          :class="store.isPublished ? 'status-row--on' : 'status-row--off'"
        >
          <v-switch
            v-model="store.isPublished"
            :label="t('articleForm.publishToggle')"
            color="success"
            density="comfortable"
            hide-details
            inset
          />
          <p class="text-caption text-medium-emphasis mb-0">
            {{ store.isPublished ? t('articleForm.publishToggleOnHint') : t('articleForm.publishToggleOffHint') }}
          </p>
        </div>

        <v-text-field
          v-model="store.fields.publishedAt"
          :label="t('articleForm.publishDate')"
          :hint="t('articleForm.publishDateHint')"
          type="datetime-local"
          variant="outlined"
          density="comfortable"
          prepend-inner-icon="mdi-calendar-clock"
          persistent-hint
        />
      </div>
    </AdminFormCard>

    <!-- Cover image -->
    <AdminFormCard
      icon="mdi-image-outline"
      :title="t('articleForm.coverImage')"
      :hint="t('articleForm.coverUploadHint')"
      optional
    >
      <!-- Preview once an image is set, dropzone before that. -->
      <div
        v-if="store.fields.coverImage"
        class="cover-frame rounded-lg mb-3"
      >
        <NuxtImg
          :src="store.fields.coverImage"
          :alt="t('articleForm.coverPreviewAlt')"
          width="400"
          height="225"
          fit="cover"
          loading="lazy"
          sizes="sm:100vw md:400px"
          class="cover-preview"
        />
        <v-btn
          icon="mdi-delete-outline"
          size="small"
          color="error"
          variant="flat"
          class="cover-remove"
          :aria-label="t('articleForm.coverRemove')"
          @click="removeCover"
        />
      </div>
      <button
        v-else
        type="button"
        class="cover-dropzone rounded-lg mb-3 d-flex flex-column align-center justify-center ga-1"
        :disabled="coverUploading"
        :aria-label="t('articleForm.coverUpload')"
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
            aria-hidden="true"
          />
          <span class="text-body-2 font-weight-medium">{{ t('articleForm.coverUpload') }}</span>
        </template>
      </button>

      <v-alert
        v-if="coverError"
        type="error"
        variant="tonal"
        density="compact"
        role="alert"
        class="mb-3"
        :text="coverError"
      />

      <input
        ref="coverInput"
        type="file"
        accept="image/*"
        class="d-none"
        tabindex="-1"
        :aria-label="t('articleForm.coverUpload')"
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
    </AdminFormCard>

    <!-- Reading time -->
    <AdminFormCard
      icon="mdi-clock-time-four-outline"
      :title="t('articleForm.readingTime')"
      optional
    >
      <!-- Big, readable value between the two steppers. aria-live lets a screen
           reader announce the new value after each step. -->
      <div class="d-flex align-baseline justify-center ga-4 mb-3">
        <v-btn
          icon="mdi-minus"
          variant="tonal"
          density="comfortable"
          :disabled="readingTime <= 0"
          :aria-label="t('articleForm.readingTimeDecrease')"
          @click="stepReadingTime(-1)"
        />

        <p
          class="text-center mb-0"
          aria-live="polite"
        >
          <span class="reading-value font-weight-bold">{{ readingTime || '—' }}</span>
          <span class="text-caption text-medium-emphasis">{{ t('article.min') }}</span>
        </p>

        <v-btn
          icon="mdi-plus"
          variant="tonal"
          density="comfortable"
          :disabled="readingTime >= READING_TIME_MAX"
          :aria-label="t('articleForm.readingTimeIncrease')"
          @click="stepReadingTime(1)"
        />
      </div>

      <!-- Quick picks -->
      <div
        role="group"
        :aria-label="t('articleForm.readingTimePresets')"
        class="d-flex flex-wrap justify-center ga-2"
      >
        <v-chip
          v-for="preset in READING_TIME_PRESETS"
          :key="preset"
          size="small"
          class="reading-preset"
          :variant="readingTime === preset ? 'flat' : 'tonal'"
          :color="readingTime === preset ? 'primary' : undefined"
          :aria-pressed="readingTime === preset"
          @click="readingTime = preset"
        >
          {{ preset }} {{ t('article.min') }}
        </v-chip>
      </div>
    </AdminFormCard>
  </v-col>
</template>

<style scoped>
/* Publish state row */
.status-row {
  border: 1px solid transparent;
}

.status-row--on {
  border-color: rgba(var(--v-theme-success), 0.25);
  background: rgba(var(--v-theme-success), 0.08);
}

.status-row--off {
  border-color: rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-on-surface), 0.04);
}

/* Cover image */
.cover-frame {
  position: relative;
  overflow: hidden;
  aspect-ratio: 16 / 9;
  background: rgba(var(--v-theme-on-surface), 0.04);
}

.cover-preview {
  inline-size: 100%;
  block-size: 100%;
  object-fit: cover;
}

.cover-remove {
  position: absolute;
  top: 8px;
  inset-inline-end: 8px;
}

.cover-dropzone {
  inline-size: 100%;
  aspect-ratio: 16 / 9;
  padding: 8px;
  border: 2px dashed rgba(var(--v-theme-primary), 0.35);
  background: rgba(var(--v-theme-primary), 0.04);
  color: rgb(var(--v-theme-on-surface));
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.cover-dropzone:disabled {
  cursor: default;
}

.cover-dropzone:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

@media (hover: hover) {
  .cover-dropzone:hover:not(:disabled) {
    border-color: rgb(var(--v-theme-primary));
    background: rgba(var(--v-theme-primary), 0.08);
  }
}

/* Reading time: one big number, easy to read at a glance. */
.reading-value {
  display: block;
  font-size: 2rem;
  line-height: 1;
  color: rgb(var(--v-theme-primary));
}

/* Comfortable tap height for the quick picks. */
.reading-preset {
  min-block-size: 32px;
}

/*
 * From md up the sidebar is a real second column, so it follows the (much
 * taller) content column while scrolling. --v-layout-top is the app bar height
 * exposed by Vuetify; the extra 80px clears the sticky action bar.
 */
@media (min-width: 960px) {
  .editor-sidebar {
    position: sticky;
    top: calc(var(--v-layout-top, 64px) + 80px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .cover-dropzone {
    transition: none;
  }
}
</style>
