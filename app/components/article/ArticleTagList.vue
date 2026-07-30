<script setup lang="ts">
/** Keyword chips closing the article body. Names arrive already localized. */
defineProps<{
  names: string[]
}>()

const { t } = useI18n()
</script>

<template>
  <section aria-labelledby="article-tags-heading">
    <v-divider class="mb-4" />

    <h2
      id="article-tags-heading"
      class="text-overline text-medium-emphasis mb-2"
    >
      {{ t('article.tagsLabel') }}
    </h2>

    <div class="d-flex flex-wrap ga-2">
      <v-chip
        v-for="name in names"
        :key="name"
        color="primary"
        variant="tonal"
        size="small"
      >
        {{ name }}
      </v-chip>
    </div>
  </section>
</template>
