<script setup lang="ts">
import type { ArticleListItem } from '~~/shared/types/article'
import type { Category } from '~~/shared/types/category'
import { useLocale } from 'vuetify'

definePageMeta({ layout: 'default' })

const { t } = useI18n()
const localePath = useLocalePath()

// The home page is the most important URL on the site, so it gets its own
// descriptive title rather than the global fallback.
useSeoMeta({
  title: () => t('home.heroTitle'),
  description: () => t('home.heroSubtitle'),
})

// Shape returned by GET /api/articles/list (the same endpoint the category
// page uses). Returns the flat ArticleListItem shape that ArticleCard,
// HomeHeroSlide and the sidebar all consume.
interface ArticleListResponse {
  articles: ArticleListItem[]
  total: number
}

// Single source of articles for the whole page. Fetched once, then filtered
// client-side by category and sliced for the hero/recent sections. Fetched in
// parallel with categories so the home page renders as fast as the category
// page (which also relies on a single /api/articles/list request).
const { data: articlesResponse, pending } = await useFetch<ArticleListResponse>(
  '/api/articles/list',
  {
    default: () => ({ articles: [], total: 0 }),
  },
)

// Categories for the filter tabs.
const { data: categories } = await useFetch<Category[]>('/api/categories', {
  default: () => [],
})

// Active category filter (slug, or null for "all"). Emitted by CategoryFilter.
const activeCategory = ref<string | null>(null)

const allArticles = computed<ArticleListItem[]>(
  () => articlesResponse.value?.articles ?? [],
)
// Filtering happens client-side: the full published list is already loaded,
// so switching categories is instant with no extra request.
const articles = computed<ArticleListItem[]>(() => {
  if (!activeCategory.value) return allArticles.value
  return allArticles.value.filter(
    article => article.categorySlug === activeCategory.value,
  )
})

const hasArticles = computed(() => articles.value.length > 0)

// Curated positions win. Empty positions gracefully fall back to recent
// published articles so the hero always remains complete during setup.
const heroArticles = computed(() => {
  const selected = [...allArticles.value]
    .filter(article => article.homePosition !== null)
    .sort((a, b) => (a.homePosition ?? 99) - (b.homePosition ?? 99))

  const selectedIds = new Set(selected.map(article => article.id))
  const fallback = allArticles.value.filter(article => !selectedIds.has(article.id))
  return [...selected, ...fallback].slice(0, 4)
})
const recentArticles = computed(() => allArticles.value.slice(0, 5))

// Cap the main list so the home page stays a curated preview, not a full feed.
const MAX_LIST_ITEMS = 8
const listArticles = computed(() => articles.value.slice(0, MAX_LIST_ITEMS))

const { isRtl } = useLocale()

const readMoreIcon = computed(() =>
  isRtl.value
    ? 'mdi-arrow-left'
    : 'mdi-arrow-right',
)
</script>

<template>
  <div class="px-1">
    <!-- Hero carousel -->
    <section class="mb-8">
      <HomeHeroSlide :hero-articles="heroArticles" />
    </section>

    <!-- Category filter tabs -->
    <home-category-filter
      v-model="activeCategory"
      :categories="categories"
    />

    <v-divider class="mb-6" />

    <v-row>
      <v-col
        cols="12"
        md="8"
      >
        <!-- Loading -->
        <div
          v-if="pending"
          class="d-flex justify-center py-8"
        >
          <v-progress-circular
            indeterminate
            color="primary"
          />
        </div>

        <!-- Articles -->
        <div
          v-else-if="hasArticles"
          class="d-flex flex-column ga-4"
        >
          <ArticleCard
            v-for="article in listArticles"
            :key="article.id"
            :article="article"
            variant="horizontal"
          />
        </div>

        <!-- Empty state -->
        <v-alert
          v-else
          type="info"
          variant="tonal"
          class="mt-4"
        >
          {{ t('common.noResults') }}
        </v-alert>

        <div class="text-center mt-6">
          <v-btn
            :to="localePath('/articles')"
            variant="outlined"
            color="primary"
          >
            {{ t('common.readMore') }}
            <v-icon
              :icon="readMoreIcon"
              class="ms-1"
            />
          </v-btn>
        </div>
      </v-col>

      <v-col
        cols="12"
        md="4"
      >
        <!-- Lazy hydration: the sidebar HTML is still server-rendered, but
             its JavaScript only runs once it is scrolled into view. On
             mobile it sits entirely below the fold, so this removes its
             hydration cost from startup (TBT). -->
        <LazyLayoutAppSidebar
          hydrate-on-visible
          :recent-articles="recentArticles"
          :loading="pending"
        />
      </v-col>
    </v-row>

    <!-- Newsletter -->
    <section class="mt-12 mb-4">
      <v-card
        flat
        rounded="lg"
        class="pa-2 pa-lg-4 text-center newsletter-card"
      >
        <h2 class="text-title-medium text-md-headline-small font-weight-bold mb-2">
          <v-icon
            icon="mdi-email-outline"
            size="default"
            color="primary"
            class="mb-3 me-2"
          />
          {{ t('newsletter.title') }}
        </h2>
        <p class="text-body-2 text-medium-emphasis mb-5 mx-auto">
          {{ t('home.newsletterDesc') }}
        </p>
        <div class="mx-auto">
          <!-- Bottom of the page: hydrate only when the visitor reaches it. -->
          <LazyNewsletterForm hydrate-on-visible />
        </div>
      </v-card>
    </section>
  </div>
</template>

<style scoped>
.newsletter-card {
  background: rgba(var(--v-theme-primary), 0.05);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
}
</style>
