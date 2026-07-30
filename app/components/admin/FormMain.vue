<script setup lang="ts">
/**
 * Left column of the article editor: everything that belongs to the language
 * currently selected in the header (title, excerpt, body), plus the shared URL
 * slug and the media gallery.
 */
import { useDisplay } from 'vuetify'
import { useArticleFormStore } from '~/stores/articleFormStore'

const store = useArticleFormStore()
const { t } = useI18n()
const { smAndDown } = useDisplay()
const { required, slugFormat } = useArticleFormRules()

/** Human label of the language being edited, used in headings like "Contenu (FR)". */
const activeLabel = computed(
  () => store.locales.find(locale => locale.code === store.activeLocale)?.label ?? '',
)

/** A shorter editor on phones keeps the sticky action bar and the fields close. */
const bodyRows = computed(() => (smAndDown.value ? 10 : 18))
</script>

<template>
  <v-col
    cols="12"
    md="8"
  >
    <!-- Localized content: title + excerpt of the active language -->
    <AdminFormCard
      icon="mdi-format-title"
      :title="t('articleForm.editor.localized', { lang: activeLabel })"
      :hint="t('articleForm.editor.languageHint')"
    >
      <template #actions>
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
      </template>

      <v-text-field
        v-model="store.activeTitle"
        :label="t('articleForm.titles')"
        :rules="[required]"
        :dir="store.activeDir"
        variant="outlined"
        density="comfortable"
        counter="120"
        class="mb-2"
      />
      <v-textarea
        v-model="store.activeExcerpt"
        :label="t('articleForm.excerpts')"
        :hint="t('articleForm.excerptHint')"
        :dir="store.activeDir"
        variant="outlined"
        density="comfortable"
        rows="3"
        auto-grow
        counter="220"
        persistent-hint
      />
    </AdminFormCard>

    <!-- URL slug: shared by both languages -->
    <AdminFormCard
      icon="mdi-link-variant"
      :title="t('articleForm.urlSlug')"
    >
      <v-text-field
        v-model="store.fields.slug"
        :label="t('articleForm.slug')"
        :rules="[required, slugFormat]"
        :hint="t('articleForm.slugHint')"
        variant="outlined"
        density="comfortable"
        persistent-hint
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        @input="store.markSlugEdited"
      >
        <template #prepend-inner>
          <span class="text-body-2 text-medium-emphasis">/articles/</span>
        </template>
      </v-text-field>
    </AdminFormCard>

    <!-- Body: each language has its own content -->
    <AdminFormCard
      icon="mdi-text-long"
      :title="`${t('articleForm.body')} (${activeLabel})`"
      :hint="t('articleForm.editor.localizedBodyHint')"
    >
      <v-textarea
        v-model="store.activeBody"
        :label="t('articleForm.bodyLabel')"
        :placeholder="t('articleForm.bodyPlaceholder')"
        :rules="[required]"
        :rows="bodyRows"
        :dir="store.activeDir"
        :hint="t('articleForm.markdownSupported')"
        variant="outlined"
        density="comfortable"
        auto-grow
        persistent-hint
        class="font-monospace"
      />
    </AdminFormCard>

    <AdminArticleMediaEditor />
  </v-col>
</template>

<style scoped>
/* Markdown reads better in a monospaced face, but not smaller than 16px:
   anything below that makes iOS Safari zoom in when the field is focused. */
.font-monospace :deep(textarea) {
  font-size: 1rem;
  line-height: 1.6;
}
</style>
