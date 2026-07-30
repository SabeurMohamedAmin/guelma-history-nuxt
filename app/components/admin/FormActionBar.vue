<script setup lang="ts">
/**
 * Sticky action bar of the article editor.
 *
 * The form is long, so the bar sticks just under the admin app bar while the
 * page scrolls: Publish and Discard stay one tap away on a phone and on a wide
 * screen, and the buttons exist only once in the page. Publish is a real submit
 * button, so pressing Enter inside a text field saves the article as well.
 */
import { useArticleFormStore } from '~/stores/articleFormStore'

const store = useArticleFormStore()
const { t } = useI18n()
const localePath = useLocalePath()

/** Saving, or a media file still uploading: block a second submit. */
const busy = computed(() => store.loading || store.isUploadingMedia)

const primaryLabel = computed(() => {
  if (store.isUploadingMedia) return t('articleForm.media.uploadingWait')
  return store.isEditing ? t('common.save') : t('articleForm.publish')
})
</script>

<template>
  <div class="action-bar d-flex align-center ga-2 mb-4 pa-2 pa-sm-3 rounded-xl">
    <!-- Mirrors the publish switch in the sidebar. Hidden on very small screens
         so the two buttons always fit on one line. -->
    <v-chip
      :color="store.isPublished ? 'success' : 'medium-emphasis'"
      :prepend-icon="store.isPublished ? 'mdi-earth' : 'mdi-file-document-outline'"
      size="small"
      variant="tonal"
      class="d-none d-sm-inline-flex"
    >
      {{ store.isPublished ? t('articleForm.statusPublished') : t('articleForm.statusPending') }}
    </v-chip>

    <v-spacer />

    <v-btn
      variant="text"
      rounded="pill"
      class="text-none"
      :to="localePath(store.listPath)"
      :disabled="store.loading"
    >
      {{ t('articleForm.discard') }}
    </v-btn>

    <v-btn
      type="submit"
      color="primary"
      variant="flat"
      rounded="pill"
      prepend-icon="mdi-check"
      class="text-none"
      :loading="busy"
      :disabled="busy"
    >
      {{ primaryLabel }}
    </v-btn>
  </div>

  <!-- Explains why Publish is temporarily unavailable. -->
  <p
    v-if="store.isUploadingMedia"
    class="text-caption text-medium-emphasis mb-4 px-2"
    role="status"
  >
    {{ t('articleForm.media.uploadingHint') }}
  </p>
</template>

<style scoped>
.action-bar {
  position: sticky;
  /* Vuetify exposes the app bar height as --v-layout-top on the <v-app> root. */
  top: calc(var(--v-layout-top, 64px) + 8px);
  z-index: 2;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgba(var(--v-theme-surface), 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
</style>
