<script setup lang="ts">
import type { CategoryTree } from '~~/shared/types/category'

definePageMeta({
  layout: 'default',
})

const { t } = useI18n()

useHead({
  title: () => t('category.indexTitle'),
  meta: [
    { name: 'description', content: () => t('category.indexSubtitle') },
  ],
})

// GET /api/categories returns every category with its article count.
const { data: categories, pending } = await useFetch<CategoryTree[]>('/api/categories', {
  default: () => [],
})

const hasCategories = computed(() => categories.value.length > 0)
</script>

<template>
  <div class="categories-page">
    <!-- Header -->
    <header class="categories-page__header">
      <div
        class="categories-page__glow"
        aria-hidden="true"
      ></div>
      <div class="categories-page__header-content">
        <v-chip
          color="primary"
          variant="elevated"
          size="small"
          class="mb-4"
        >
          <v-icon
            start
            size="x-small"
            icon="mdi-shape-outline"
          />
          {{ t('nav.categories') }}
        </v-chip>
        <h1 class="categories-page__title">
          {{ t('category.indexTitle') }}
        </h1>
        <p class="categories-page__subtitle">
          {{ t('category.indexSubtitle') }}
        </p>
      </div>
    </header>

    <!-- Loading: skeleton cards occupy the same grid cells as the real
         category cards, so the content appears in place without shifting
         the layout (CLS). -->
    <v-row v-if="pending">
      <v-col
        v-for="n in 6"
        :key="n"
        cols="12"
        sm="6"
        md="4"
      >
        <v-skeleton-loader
          type="avatar, heading, paragraph"
          rounded="lg"
          class="pa-4"
        />
      </v-col>
    </v-row>

    <!-- Grid -->
    <CategoryGrid
      v-else-if="hasCategories"
      :categories="categories"
    />

    <!-- Empty state -->
    <v-card
      v-else
      flat
      rounded="lg"
      class="text-center pa-12 empty-card"
    >
      <v-icon
        size="64"
        color="disabled"
        icon="mdi-shape-outline"
      />
      <h2 class="text-headline-small mt-4 mb-2">
        {{ t('category.empty') }}
      </h2>
      <p class="text-body-2 text-disabled mb-0">
        {{ t('category.emptySubtitle') }}
      </p>
    </v-card>
  </div>
</template>

<style scoped>
.categories-page {
  max-width: 1200px;
  margin: 0 auto;

}

.categories-page__header {
  position: relative;
  overflow: hidden;
  margin-bottom: 2.5rem;
  padding: 3rem 1.5rem;
  text-align: center;
  border-radius: 28px;
  background:
    radial-gradient(circle at 20% 20%, rgba(var(--v-theme-primary), 0.12), transparent 40%),
    linear-gradient(135deg, rgba(var(--v-theme-surface), 0.9) 0%, rgba(var(--v-theme-primary), 0.06) 100%);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
}

.categories-page__glow {
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

.categories-page__header-content {
  position: relative;
  z-index: 1;
}

.categories-page__title {
  font-size: clamp(1.8rem, 5vw, 2.75rem);
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 0.75rem;
}

.categories-page__subtitle {
  font-size: clamp(0.95rem, 2.2vw, 1.15rem);
  color: rgba(var(--v-theme-on-surface), 0.7);
  max-width: 600px;
  margin: 0 auto;
}

.empty-card {
  background: rgba(var(--v-theme-primary), 0.04);
  border: 1px solid rgba(var(--v-theme-primary), 0.12);
}

@media (max-width: 960px) {
  .categories-page__header { padding: 2.5rem 1rem; }
}
</style>
