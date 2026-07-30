<script setup lang="ts">
/**
 * Article byline: author, publication date and reading time.
 *
 * Rendered as a list so a screen reader announces three separate facts
 * instead of one run-on sentence.
 */
defineProps<{
  authorName: string
  /** Localized author page path. Null renders plain text instead of a link. */
  authorTo?: string | null
  /** ISO date for the <time> element, invisible to readers. */
  publishedIso: string
  /** Human readable date, already formatted for the active language. */
  publishedLabel: string
  readingTimeLabel: string
}>()

const { t } = useI18n()
</script>

<template>
  <ul
    class="article-meta d-flex flex-wrap ga-2 pa-0 ma-0"
    :aria-label="t('article.metaLabel')"
  >
    <li>
      <v-chip
        :to="authorTo || undefined"
        variant="tonal"
        prepend-icon="mdi-account-circle-outline"
      >
        {{ authorName }}
      </v-chip>
    </li>

    <li v-if="publishedLabel">
      <v-chip
        variant="tonal"
        prepend-icon="mdi-calendar-blank-outline"
      >
        <time :datetime="publishedIso">{{ publishedLabel }}</time>
      </v-chip>
    </li>

    <li>
      <v-chip
        variant="tonal"
        prepend-icon="mdi-clock-outline"
      >
        {{ readingTimeLabel }}
      </v-chip>
    </li>
  </ul>
</template>

<style scoped>
.article-meta {
  list-style: none;
}
</style>
