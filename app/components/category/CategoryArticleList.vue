<script setup lang="ts">
import type { ArticleListItem } from '~~/shared/types/article'
import type { DisplayMode } from '~~/app/constants/articleSort'

/**
 * CategoryArticleList — pure presentation.
 *
 * Renders a list of articles either as a grid of borderless cards
 * (display=grid) or as compact rows (display=rows). It delegates each item to
 * <ArticleCard>, choosing the matching variant. No fetching here.
 */
const props = defineProps<{
  articles: ArticleListItem[]
  display: DisplayMode
}>()

const cardVariant = computed(() =>
  props.display === 'rows' ? 'horizontal' : 'vertical',
)
</script>

<template>
  <!-- Grid of borderless cards -->
  <v-row v-if="display === 'grid'">
    <v-col
      v-for="(article, index) in articles"
      :key="article.id"
      cols="12"
      sm="6"
      md="4"
    >
      <!-- Only the first card is above the fold on mobile: it is the LCP
           element, so it alone loads its image eagerly (see ArticleCard). -->
      <ArticleCard
        :article="article"
        :variant="cardVariant"
        :priority="index === 0"
      />
    </v-col>
  </v-row>

  <!-- Compact rows -->
  <div
    v-else
    class="category-rows"
  >
    <ArticleCard
      v-for="(article, index) in articles"
      :key="article.id"
      :article="article"
      :variant="cardVariant"
      :priority="index === 0"
    />
  </div>
</template>

<style scoped>
.category-rows {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
</style>
