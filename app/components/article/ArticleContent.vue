<script setup lang="ts">
import type { ArticleView } from '~/composables/useArticleDetail'

/** The article body and its media gallery, closed by the keyword chips. */
defineProps<{
  view: ArticleView
}>()
</script>

<template>
  <v-card
    variant="flat"
    rounded="xl"
    class="glass-surface"
  >
    <ArticleBody
      :body="view.body"
      :title="view.title"
      :cover-image="view.coverImage"
      :media="view.media"
    />

    <v-card-text v-if="view.tagNames.length">
      <ArticleTagList :names="view.tagNames" />
    </v-card-text>
  </v-card>
</template>
