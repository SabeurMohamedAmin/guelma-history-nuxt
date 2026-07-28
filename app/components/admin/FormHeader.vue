<script setup lang="ts">
import { useArticleFormStore } from '~/stores/articleFormStore'

const store = useArticleFormStore()
const { t } = useI18n()
const localePath = useLocalePath()

const title = computed(() => (store.isEditing ? t('admin.editArticle') : t('articleForm.newTitle')))
const subtitle = computed(() => (store.isEditing ? t('articleForm.editSubtitle') : t('articleForm.newSubtitle')))

// Map a locale's completion state to the colour/icon used on its badge.
function badge(complete: boolean, percent: number) {
  if (complete) return { color: 'success', icon: 'mdi-check-circle', label: t('articleForm.editor.complete') }
  if (percent > 0) return { color: 'warning', icon: 'mdi-progress-pencil', label: t('articleForm.editor.draft') }
  return { color: 'medium-emphasis', icon: 'mdi-circle-outline', label: t('articleForm.editor.missing') }
}
</script>

<template>
  <div class="editor-header mb-6 rounded-xl overflow-hidden">
    <!-- Title row -->
    <div class="d-flex align-center ga-3 px-4 px-sm-6 pt-4 pt-sm-5">
      <v-btn
        icon="mdi-arrow-left"
        variant="tonal"
        size="small"
        :to="localePath(store.listPath)"
        :aria-label="t('articleForm.discard')"
      />
      <div class="flex-grow-1">
        <h1 class="text-h5 text-sm-h4 font-weight-bold">
          {{ title }}
        </h1>
        <p class="text-body-2 text-medium-emphasis mt-1 mb-0">
          {{ subtitle }}
        </p>
      </div>
      <v-icon
        icon="mdi-text-box-edit-outline"
        size="40"
        class="d-none d-sm-flex header-watermark"
      />
    </div>

    <!-- Language switcher -->
    <div class="language-switcher mt-4 mt-sm-5 px-4 px-sm-6 py-3 d-flex flex-wrap align-center ga-3">
      <div class="d-flex align-center ga-2">
        <v-icon
          icon="mdi-translate"
          size="18"
          class="text-medium-emphasis"
        />
        <span class="text-caption text-medium-emphasis font-weight-medium text-uppercase">
          {{ t('articleForm.editor.languages') }}
        </span>
      </div>

      <div class="locale-pills d-flex flex-wrap ga-2">
        <button
          v-for="locale in store.locales"
          :key="locale.code"
          type="button"
          class="locale-pill d-inline-flex align-center ga-2 px-3 py-2 rounded-pill"
          :class="{
            'locale-pill--active': store.activeLocale === locale.code,
            'locale-pill--disabled': !locale.enabled,
          }"
          :disabled="!locale.enabled"
          @click="store.setLocale(locale.code)"
        >
          <span class="font-weight-bold text-body-2">{{ locale.label }}</span>

          <v-icon
            v-if="locale.enabled"
            :icon="badge(locale.completion.complete, locale.completion.percent).icon"
            :color="badge(locale.completion.complete, locale.completion.percent).color"
            size="16"
          />
          <v-chip
            v-else
            size="x-small"
            variant="tonal"
            color="medium-emphasis"
          >
            {{ t('articleForm.editor.comingSoon') }}
          </v-chip>

          <v-tooltip
            activator="parent"
            location="bottom"
          >
            <template v-if="locale.enabled">
              {{ badge(locale.completion.complete, locale.completion.percent).label }}
              ({{ locale.completion.percent }}%)
            </template>
            <template v-else>
              {{ t('articleForm.editor.enComingSoon') }}
            </template>
          </v-tooltip>
        </button>
      </div>

      <v-spacer />

      <v-chip
        v-if="store.activeDir === 'rtl'"
        size="small"
        variant="flat"
        color="primary"
        prepend-icon="mdi-format-textdirection-r-to-l"
      >
        {{ t('articleForm.editor.rtlMode') }}
      </v-chip>
    </div>
  </div>
</template>

<style scoped>
.editor-header {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.08), rgba(var(--v-theme-primary), 0.02));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.header-watermark {
  color: rgba(var(--v-theme-primary), 0.35);
}

.language-switcher {
  background: rgba(var(--v-theme-surface), 0.6);
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.06);
}

.locale-pill {
  background: rgba(var(--v-theme-surface), 1);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: all 0.18s ease;
}

.locale-pill:hover:not(.locale-pill--disabled) {
  border-color: rgba(var(--v-theme-primary), 0.5);
  transform: translateY(-1px);
}

.locale-pill--active {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-on-primary));
  box-shadow: 0 4px 12px rgba(var(--v-theme-primary), 0.3);
}

.locale-pill--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
