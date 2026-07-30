<script setup lang="ts">
import { useArticleFormStore } from '~/stores/articleFormStore'

const store = useArticleFormStore()
const { t } = useI18n()

// Human label for the active locale, used in section titles like “Contenu (FR)”.
const activeLabel = computed(
  () => store.locales.find(l => l.code === store.activeLocale)?.label ?? '',
)
</script>

<template>
  <v-col
    cols="12"
    md="8"
  >
    <!-- Localized content (title + excerpt) -->
    <v-card
      rounded="xl"
      elevation="0"
      class="editor-card mb-4"
    >
      <div class="d-flex align-center ga-3 pa-2 px-md-6 pt-3 pt-md-6">
        <div class="card-icon">
          <v-icon icon="mdi-format-title" />
        </div>
        <div class="flex-grow-1">
          <div class="text-subtitle-1 font-weight-bold">
            {{ t('articleForm.editor.localized', { lang: activeLabel }) }}
          </div>
        </div>
        <v-btn
          v-if="store.activeLocale !== 'fr'"
          size="small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-content-copy"
          class="text-none"
          @click="store.copyFromFr"
        >
          {{ t('articleForm.editor.copyFromFr') }}
        </v-btn>
      </div>
      <v-card-text class="px-2 px-md-4 py-3 py-md-4">
        <v-text-field
          v-model="store.activeTitle"
          :label="t('articleForm.titles')"
          :rules="[store.rules.required]"
          variant="outlined"
          density="comfortable"
          class="mb-3"
          :dir="store.activeDir"
        />
        <v-textarea
          v-model="store.activeExcerpt"
          :label="t('articleForm.excerpts')"
          variant="outlined"
          density="comfortable"
          rows="3"
          auto-grow
          :dir="store.activeDir"
        />
      </v-card-text>
    </v-card>

    <!-- URL slug -->
    <v-card
      rounded="xl"
      elevation="0"
      class="editor-card mb-4"
    >
      <div class="d-flex align-center ga-3 px-2 px-md-4 py-3 py-md-4">
        <div class="card-icon">
          <v-icon icon="mdi-link-variant" />
        </div>
        <div class="text-subtitle-1 font-weight-bold">
          {{ t('articleForm.urlSlug') }}
        </div>
      </div>
      <v-card-text class="pt-4">
        <v-text-field
          v-model="store.fields.slug"
          :label="t('articleForm.slug')"
          :rules="[store.rules.required, store.rules.slug]"
          variant="outlined"
          density="comfortable"
          :hint="t('articleForm.slugHint')"
          persistent-hint
          @input="store.markSlugEdited"
        >
          <template #prepend-inner>
            <span class="text-medium-emphasis text-body-2">/articles/</span>
          </template>
        </v-text-field>
      </v-card-text>
    </v-card>

    <!-- Body (localized: each language has its own content) -->
    <v-card
      rounded="xl"
      elevation="0"
      class="editor-card mb-4 pa-2 px-md-4 py-3 py-md-4"
    >
      <div class="d-flex align-center ga-3">
        <div class="card-icon">
          <v-icon icon="mdi-text-long" />
        </div>
        <div class="flex-grow-1">
          <div class="text-subtitle-1 font-weight-bold">
            {{ t('articleForm.body') }} ({{ activeLabel }})
          </div>
        </div>
      </div>
      <v-card-text class="pa-0 pt-4">
        <v-textarea
          v-model="store.activeBody"
          :label="t('articleForm.bodyLabel')"
          :placeholder="t('articleForm.bodyPlaceholder')"
          :rules="[store.rules.required]"
          variant="outlined"
          density="comfortable"
          rows="16"
          auto-grow
          class="font-monospace"
          :dir="store.activeDir"
        />
        <p class="text-caption text-medium-emphasis mt-1 mb-0">
          {{ t('articleForm.markdownSupported') }} · {{ t('articleForm.editor.localizedBodyHint') }}
        </p>
      </v-card-text>
    </v-card>

    <AdminArticleMediaEditor />
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
</style>
