<script setup lang="ts">
import type { CategoryTree } from '~~/shared/types/category'
import type { DisplayMode } from '~~/app/constants/articleSort'
import type { SearchFilterKey } from '~/components/search/SearchActiveFilters.vue'

const { t, locale } = useI18n()

const {
  params,
  query,
  total,
  articles,
  pending,
  error,
  isEmpty,
  hasQuery,
  page,
  pageCount,
  search,
  goToPage,
  refresh,
} = useArticleSearch()

// ─── Local form state, seeded from the URL ────────────────
// Shared links and browser history therefore prefill every input.
const term = ref(params.value.q)
const category = ref(params.value.category)
const dateFrom = ref(params.value.dateFrom)
const dateTo = ref(params.value.dateTo)

// Grid or rows, a personal preference that only lives for the visit.
const display = ref<DisplayMode>('rows')

// Categories power the filter select. An empty list keeps the panel usable
// while the request is still in flight.
const { data: categories } = await useFetch<CategoryTree[]>('/api/categories', {
  default: () => [],
})

// Suggested entry points for visitors who land here without a query.
const { categories: suggestions } = useNavCategories()

// ─── Derived ──────────────────────────────────────────────
const hasError = computed(() => Boolean(error.value))

const categoryLabel = computed(() => {
  const found = categories.value.find(item => item.slug === params.value.category)
  if (!found) return null
  return locale.value === 'ar' ? found.nameAr : found.nameFr
})

// Single sentence describing the current state, rendered in a live region so
// screen readers hear "searching…" then the number of results.
const statusText = computed(() => {
  if (pending.value) return t('search.searching')
  if (!hasQuery.value) return ''
  return t('search.resultsCount', { count: total.value, query: query.value })
})

// ─── Behavior ─────────────────────────────────────────────
const resultsRef = ref<HTMLElement | null>(null)

/** Bring the results into view, honoring the reduced-motion preference. */
function scrollToResults(): void {
  if (!import.meta.client || !resultsRef.value) return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  resultsRef.value.scrollIntoView({
    behavior: reducedMotion ? 'auto' : 'smooth',
    block: 'start',
  })
}

/** Run the search with whatever the form currently holds. */
async function runSearch(): Promise<void> {
  await search({
    q: term.value.trim(),
    category: category.value || null,
    dateFrom: dateFrom.value || null,
    dateTo: dateTo.value || null,
  })
  scrollToResults()
}

async function onRemoveFilter(key: SearchFilterKey): Promise<void> {
  if (key === 'q') term.value = ''
  if (key === 'category') category.value = null
  if (key === 'dateFrom') dateFrom.value = null
  if (key === 'dateTo') dateTo.value = null

  await runSearch()
}

async function onReset(): Promise<void> {
  term.value = ''
  category.value = null
  dateFrom.value = null
  dateTo.value = null

  await search({ q: '', category: null, dateFrom: null, dateTo: null })
}

async function onPageChange(next: number): Promise<void> {
  await goToPage(next)
  scrollToResults()
}

// Keep the inputs in step with the URL (back/forward, deep links).
watch(params, (next) => {
  term.value = next.q
  category.value = next.category
  dateFrom.value = next.dateFrom
  dateTo.value = next.dateTo
})

// The search dialog can be opened from anywhere on a page (even next to the
// footer) and only changes the query string, so the router keeps the viewport
// where it was. Start this page at the top instead.
onMounted(() => {
  window.scrollTo({ top: 0 })
})

// ─── SEO ─────────────────────────────────────────────────
// Indexing is already disabled for /search via routeRules; the title is here
// so the browser tab and history entry stay meaningful.
useSeoMeta({
  title: () => (query.value ? `${t('search.title')} — ${query.value}` : t('search.title')),
  description: () => t('search.subtitle'),
})
</script>

<template>
  <div class="search-page">
    <!-- ─── Hero + search form ───────────────────────────── -->
    <header class="search-page__hero">
      <div
        class="search-page__glow"
        aria-hidden="true"
      ></div>

      <div class="search-page__hero-content">
        <v-chip
          color="primary"
          variant="elevated"
          size="small"
          class="mb-4"
        >
          <v-icon
            start
            size="x-small"
            icon="mdi-magnify"
          />
          {{ t('search.title') }}
        </v-chip>

        <h1 class="search-page__title">
          {{ t('search.prompt') }}
        </h1>

        <p class="search-page__subtitle">
          {{ t('search.subtitle') }}
        </p>

        <SearchForm
          v-model:term="term"
          v-model:category="category"
          v-model:date-from="dateFrom"
          v-model:date-to="dateTo"
          :categories="categories"
          :pending="pending"
          class="search-page__form"
          @submit="runSearch"
          @reset="onReset"
        />
      </div>
    </header>

    <!-- ─── Criteria behind the current results ──────────── -->
    <SearchActiveFilters
      :q="params.q"
      :category-label="categoryLabel"
      :date-from="params.dateFrom"
      :date-to="params.dateTo"
      class="mb-4"
      @remove="onRemoveFilter"
      @clear="onReset"
    />

    <!-- ─── Status + display mode ────────────────────────── -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-4">
      <!-- Always rendered: a live region must exist before it updates. -->
      <p
        class="text-body-2 text-medium-emphasis mb-0"
        role="status"
        aria-live="polite"
      >
        {{ statusText }}
      </p>

      <v-btn-toggle
        v-if="hasQuery"
        v-model="display"
        color="primary"
        density="comfortable"
        variant="outlined"
        rounded="lg"
        mandatory
      >
        <v-btn
          value="grid"
          size="small"
          :aria-label="t('category.displayGrid')"
        >
          <v-icon icon="mdi-view-grid-outline" />
        </v-btn>
        <v-btn
          value="rows"
          size="small"
          :aria-label="t('category.displayRows')"
        >
          <v-icon icon="mdi-view-sequential-outline" />
        </v-btn>
      </v-btn-toggle>
    </div>

    <!-- ─── Results ──────────────────────────────────────── -->
    <section
      ref="resultsRef"
      :aria-label="t('search.resultsRegion')"
      :aria-busy="pending ? 'true' : 'false'"
    >
      <!-- Loading -->
      <SearchResultsSkeleton
        v-if="pending"
        :display="display"
      />

      <!-- Error -->
      <CategoryStateMessage
        v-else-if="hasError"
        variant="error"
        @retry="refresh"
      />

      <!-- Results -->
      <template v-else-if="articles.length">
        <CategoryArticleList
          :articles="articles"
          :display="display"
        />

        <div
          v-if="pageCount > 1"
          class="d-flex justify-center mt-8"
        >
          <v-pagination
            :model-value="page"
            :length="pageCount"
            :total-visible="5"
            :disabled="pending"
            density="comfortable"
            rounded="lg"
            @update:model-value="onPageChange"
          />
        </div>
      </template>

      <!-- Searched, found nothing -->
      <v-empty-state
        v-else-if="isEmpty"
        icon="mdi-magnify-close"
        :title="t('search.noResultsTitle')"
        :text="t('search.noResultsText', { query })"
      >
        <template #actions>
          <v-btn
            color="primary"
            variant="tonal"
            rounded="lg"
            class="text-none"
            @click="onReset"
          >
            <v-icon
              start
              icon="mdi-filter-off-outline"
              size="18"
            />
            {{ t('search.clearAll') }}
          </v-btn>
        </template>
      </v-empty-state>

      <!-- Idle: nothing searched yet -->
      <div
        v-else
        class="search-page__idle text-center"
      >
        <v-icon
          icon="mdi-compass-outline"
          size="56"
          color="primary"
          class="mb-3"
        />

        <h2 class="text-headline-small font-weight-bold mb-2">
          {{ t('search.idleTitle') }}
        </h2>

        <p class="text-body-2 text-medium-emphasis mb-5">
          {{ t('search.idleText') }}
        </p>

        <nav
          class="d-flex flex-wrap justify-center ga-2"
          :aria-label="t('nav.categories')"
        >
          <v-chip
            v-for="suggestion in suggestions"
            :key="suggestion.key"
            :to="suggestion.to"
            color="primary"
            variant="tonal"
            rounded="lg"
            size="small"
          >
            {{ suggestion.title }}
          </v-chip>
        </nav>
      </div>
    </section>
  </div>
</template>

<style scoped>
.search-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

/* Same tinted, glowing header as the articles listing, so the search page
   reads as part of the same family. */
.search-page__hero {
  position: relative;
  overflow: hidden;
  margin-bottom: 1.5rem;
  padding: 3rem 1.5rem;
  text-align: center;
  border-radius: 28px;
  background:
    radial-gradient(circle at 20% 20%, rgba(var(--v-theme-primary), 0.12), transparent 40%),
    linear-gradient(135deg, rgba(var(--v-theme-surface), 0.9) 0%, rgba(var(--v-theme-primary), 0.06) 100%);
  border: 1px solid rgba(var(--v-theme-primary), 0.15);
}

/* Decorative blur. `inset-inline-start` keeps it on the reading side in RTL. */
.search-page__glow {
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

.search-page__hero-content {
  position: relative;
  z-index: 1;
}

.search-page__title {
  font-size: clamp(1.8rem, 5vw, 2.75rem);
  font-weight: 800;
  line-height: 1.15;
  margin-bottom: 0.75rem;
  text-wrap: balance;
}

.search-page__subtitle {
  font-size: clamp(0.95rem, 2.2vw, 1.1rem);
  color: rgba(var(--v-theme-on-surface), 0.7);
  max-width: 620px;
  margin: 0 auto 1.75rem;
}

/* The form is centered but its own content stays start-aligned. */
.search-page__form {
  max-width: 720px;
  margin: 0 auto;
  text-align: start;
}

.search-page__idle {
  padding: 3rem 1rem;
}

@media (max-width: 960px) {
  .search-page {
    padding: 0.5rem;
  }

  .search-page__hero {
    padding: 2.5rem 1rem;
  }
}
</style>
