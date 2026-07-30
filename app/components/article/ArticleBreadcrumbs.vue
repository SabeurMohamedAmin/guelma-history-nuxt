<script setup lang="ts">
import { useRtl } from 'vuetify'
import type { ArticleBreadcrumb } from '~/composables/useArticleDetail'

/**
 * Article trail: Home > Articles > Category.
 * Gives readers a way out of the page and search engines internal links.
 */
defineProps<{
  items: ArticleBreadcrumb[]
}>()

const { t } = useI18n()
const { isRtl } = useRtl()

// The trail reads right-to-left in Arabic, so the chevron has to flip.
const dividerIcon = computed(() => (isRtl.value ? 'mdi-chevron-left' : 'mdi-chevron-right'))
</script>

<template>
  <nav :aria-label="t('article.breadcrumbLabel')">
    <v-breadcrumbs
      :items="items"
      density="compact"
      class="px-0 pt-0 text-body-2"
    >
      <template #divider>
        <v-icon
          :icon="dividerIcon"
          size="16"
        />
      </template>
    </v-breadcrumbs>
  </nav>
</template>
