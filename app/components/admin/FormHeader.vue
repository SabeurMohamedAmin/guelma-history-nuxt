<script setup lang="ts">
/**
 * Editor header: back link, page title, overall translation progress and the
 * language switcher.
 *
 * The language pills are toggle buttons (aria-pressed) rather than links: each
 * one carries a full sentence as its accessible name ("AR — draft (66%)"), and a
 * visually hidden status line announces the language that is now being edited.
 */
import { useArticleFormStore } from '~/stores/articleFormStore'

/** Shape of one entry of `store.locales`, kept local so the helpers stay typed. */
interface LocalePill {
  label: string
  enabled: boolean
  completion: { percent: number, complete: boolean }
}

const store = useArticleFormStore()
const { t } = useI18n()
const localePath = useLocalePath()

const title = computed(() => (store.isEditing ? t('admin.editArticle') : t('articleForm.newTitle')))
const subtitle = computed(() => (store.isEditing ? t('articleForm.editSubtitle') : t('articleForm.newSubtitle')))

const activeLabel = computed(
  () => store.locales.find(locale => locale.code === store.activeLocale)?.label ?? '',
)

/** Only editable languages count towards the progress bar (EN is not ready). */
const editableLocales = computed(() => store.locales.filter(locale => locale.enabled))

/** Average completion of the editable languages, from 0 to 100. */
const progress = computed(() => {
  if (!editableLocales.value.length) return 0
  const sum = editableLocales.value.reduce((total, locale) => total + locale.completion.percent, 0)
  return Math.round(sum / editableLocales.value.length)
})

/** Colour, icon and wording describing how complete one language is. */
function status(locale: LocalePill) {
  if (locale.completion.complete) {
    return { color: 'success', icon: 'mdi-check-circle', label: t('articleForm.editor.complete') }
  }
  if (locale.completion.percent > 0) {
    return { color: 'warning', icon: 'mdi-progress-pencil', label: t('articleForm.editor.draft') }
  }
  return { color: 'medium-emphasis', icon: 'mdi-circle-outline', label: t('articleForm.editor.missing') }
}

/** Accessible name of a pill: the two-letter code alone would not say much. */
function pillLabel(locale: LocalePill) {
  if (!locale.enabled) return `${locale.label} — ${t('articleForm.editor.enComingSoon')}`

  return t('articleForm.editor.localeStatus', {
    lang: locale.label,
    status: status(locale).label,
    percent: locale.completion.percent,
  })
}
</script>

<template>
  <header class="editor-header mb-4 rounded-xl overflow-hidden">
    <!-- Title row -->
    <div class="d-flex align-start ga-3 pa-3 pa-sm-4">
      <v-btn
        icon="mdi-arrow-left"
        variant="tonal"
        density="comfortable"
        :to="localePath(store.listPath)"
        :aria-label="t('articleForm.backToList')"
      />

      <div class="editor-header__text flex-grow-1">
        <h1 class="text-h6 text-sm-h5 font-weight-bold mb-1">
          {{ title }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mb-0 d-none d-sm-block">
          {{ subtitle }}
        </p>
      </div>

      <v-icon
        icon="mdi-text-box-edit-outline"
        size="x-large"
        class="editor-header__watermark d-none d-md-flex"
        aria-hidden="true"
      />
    </div>

    <!-- Overall translation progress: one glance tells what is left to write. -->
    <div class="px-3 px-sm-4 pb-3">
      <div class="d-flex align-center justify-space-between ga-2 mb-1">
        <span class="text-caption text-medium-emphasis">
          {{ t('articleForm.editor.progress') }}
        </span>
        <span class="text-caption font-weight-bold">{{ progress }}%</span>
      </div>
      <v-progress-linear
        :model-value="progress"
        :color="progress === 100 ? 'success' : 'primary'"
        :aria-label="t('articleForm.editor.progress')"
        height="6"
        rounded
      />
    </div>

    <!-- Language switcher -->
    <div class="editor-header__languages d-flex flex-wrap align-center ga-3 pa-3 pa-sm-4">
      <div class="d-flex align-center ga-2">
        <v-icon
          icon="mdi-translate"
          size="18"
          class="text-medium-emphasis"
          aria-hidden="true"
        />
        <span class="text-caption text-medium-emphasis font-weight-medium text-uppercase">
          {{ t('articleForm.editor.languages') }}
        </span>
      </div>

      <div
        role="group"
        :aria-label="t('articleForm.editor.languages')"
        class="d-flex flex-wrap ga-2"
      >
        <button
          v-for="locale in store.locales"
          :key="locale.code"
          type="button"
          class="locale-pill d-inline-flex align-center ga-2 px-4 rounded-pill"
          :class="{ 'locale-pill--active': store.activeLocale === locale.code }"
          :disabled="!locale.enabled"
          :aria-pressed="store.activeLocale === locale.code"
          :aria-label="pillLabel(locale)"
          @click="store.setLocale(locale.code)"
        >
          <span class="text-body-2 font-weight-bold">{{ locale.label }}</span>
          <v-icon
            :icon="locale.enabled ? status(locale).icon : 'mdi-lock-outline'"
            :color="locale.enabled ? status(locale).color : 'medium-emphasis'"
            size="16"
            aria-hidden="true"
          />
        </button>
      </div>

      <v-spacer class="d-none d-sm-block" />

      <v-chip
        v-if="store.activeDir === 'rtl'"
        size="small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-format-textdirection-r-to-l"
      >
        {{ t('articleForm.editor.rtlMode') }}
      </v-chip>
    </div>

    <!-- Announced to screen readers whenever the language changes. -->
    <p
      class="sr-only"
      role="status"
    >
      {{ t('articleForm.editor.activeLanguage', { lang: activeLabel }) }}
    </p>
  </header>
</template>

<style scoped>
.editor-header {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.08), rgba(var(--v-theme-primary), 0.02));
}

/* Long titles must wrap instead of pushing the watermark out of the card. */
.editor-header__text {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.editor-header__watermark {
  color: rgba(var(--v-theme-primary), 0.35);
}

.editor-header__languages {
  border-block-start: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  background: rgba(var(--v-theme-surface), 0.6);
}

/* Language pill: 44px tall so it is comfortable to tap on a phone. */
.locale-pill {
  min-block-size: 44px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease;
}

.locale-pill--active {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
}

.locale-pill:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.locale-pill:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

/* Hover only where a real pointer exists, so touch never leaves a stuck state. */
@media (hover: hover) {
  .locale-pill:hover:not(:disabled):not(.locale-pill--active) {
    border-color: rgba(var(--v-theme-primary), 0.5);
    background: rgba(var(--v-theme-primary), 0.06);
  }
}

/* Available to screen readers, invisible on screen. */
.sr-only {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .locale-pill {
    transition: none;
  }
}
</style>
