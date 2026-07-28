<script setup lang="ts">
import type { CategoryTree } from '~~/shared/types/category'

definePageMeta({
  layout: 'default',
})

const { t } = useI18n()

const {
  search,
  category,
  sort,
  range,
  displayMode,
  articles,
  total,
  pending,
  error,
  isEmpty,
  hasActiveFilters,
  resetFilters,
  refresh,
} = useArticles()

// Categories power the filter dropdown. Fetched once; defaults to an empty list
// so the panel still renders (with just the "all" option) while loading.
const { data: categories } = await useFetch<CategoryTree[]>('/api/categories', {
  default: () => [],
})

const hasError = computed(() => Boolean(error.value))

useHead({
  title: () => t('nav.articles'),
  meta: [
    { name: 'description', content: () => t('articles.subtitle') },
  ],
})
</script>

<template>
  <div class="articles-page">
    <!-- Header -->
    <header class="articles-page__header">
      <div class="articles-page__glow"></div>
      <div class="articles-page__header-content">
        <v-chip
          color="primary"
          variant="elevated"
          size="small"
          class="mb-4"
        >
          <v-icon
            start
            size="x-small"
            icon="mdi-newspaper-variant-outline"
          />
          {{ t('nav.articles') }}
        </v-chip>
        <h1 class="articles-page__title">
          {{ t('articles.title') }}
        </h1>
        <p class="articles-page__subtitle">
          {{ t('articles.subtitle') }}
        </p>
      </div>
    </header>

    <!-- Search + category filters -->
    <ArticleFilterPanel
      v-model:search="search"
      v-model:category="category"
      :categories="categories"
      :has-active-filters="hasActiveFilters"
      class="mb-4"
      @clear="resetFilters"
    />

    <!-- Sort, date range and display mode -->
    <ArticleListToolbar
      v-model:sort="sort"
      v-model:range="range"
      v-model:display-mode="displayMode"
      :total="total"
      class="mb-5"
    />

    <!-- Loading -->
    <div
      v-if="pending"
      class="d-flex justify-center py-12"
    >
      <v-progress-circular
        indeterminate
        color="primary"
        size="48"
      />
    </div>

    <!-- Error -->
    <CategoryStateMessage
      v-else-if="hasError"
      variant="error"
      @retry="refresh"
    />

    <!-- Empty -->
    <CategoryStateMessage
      v-else-if="isEmpty"
      variant="empty"
    />

    <!-- Results -->
    <CategoryArticleList
      v-else
      :articles="articles"
      :display="displayMode"
    />
  </div>
</template>

<style scoped>
.articles-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.articles-page__header {
  position: relative;
  overflow: hidden;
  margin-bottom: 2rem;
  padding: 3rem 1.5rem;
  text-align: center;
  border-radius: 28px;
  background:
    radial-gradient(circle at 20% 20%, rgba(var(--v-theme-primary), 0.12), transparent 40%),
    linear-gradient(135deg, rgba(var(--v-theme-surface), 0.9) 0%, rgba(var(--v-theme-primary), 0.06) 100%);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
}

.articles-page__glow {
  position: absolute;
  top: -8rem;
  inset-inline-start: -6rem;
  width: 22rem;
  height: 22rem;
  border-radius: 999px;
  filter: blur(20px);
  opacity: 0.4;
  background: rgba(var(--v-theme-primary), 0.22);
  pointer-events: none;
}

.articles-page__header-content {
  position: relative;
  z-index: 1;
}

.articles-page__title {
  font-size: clamp(1.8rem, 5vw, 2.75rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 0.75rem;
}

.articles-page__subtitle {
  font-size: clamp(0.95rem, 2.2vw, 1.15rem);
  color: rgba(var(--v-theme-on-surface), 0.7);
  max-width: 600px;
  margin: 0 auto;
}

@media (max-width: 960px) {
  .articles-page { padding: 0.5rem; }
  .articles-page__header { padding: 2.5rem 1rem; }
}
</style>
