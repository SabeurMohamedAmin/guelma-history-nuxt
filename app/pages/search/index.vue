<script setup lang="ts">
const { t } = useI18n()

// Noindex is already applied via routeRules, but the tab still needs a name.
useSeoMeta({
  title: () => t('search.title'),
})

const {
  params,
  query,
  total,
  articles,
  pending,
  isEmpty,
  hasQuery,
  search,
} = useArticleSearch()

// ─── Local form state seeded from current URL params ──────
const term = ref(params.value.q)
const from = ref(params.value.dateFrom)
const to = ref(params.value.dateTo)

const advancedOpen = ref(Boolean(params.value.dateFrom || params.value.dateTo))

// ─── Sync local inputs if params change externally ────────
// Covers browser back/forward and deep link navigation
watch(params, (newParams) => {
  term.value = newParams.q
  from.value = newParams.dateFrom
  to.value = newParams.dateTo
})

// ─── Scroll back to the top when the query changes ────────
// The search popup can be opened from anywhere (e.g. near the footer) and
// only changes the URL query (?q=...), so the router keeps the viewport in
// place. Watch the query and, once the new results have rendered, scroll up
// so the search box and results are visible. Client-only: no window on SSR.
onMounted(async () => {
  if (!import.meta.client) return
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'smooth' })
})

// ─── Derived ──────────────────────────────────────────────
const canSubmit = computed(() => term.value.trim().length > 0)

// ─── Actions ─────────────────────────────────────────────
function toggleAdvanced(): void {
  advancedOpen.value = !advancedOpen.value
}

async function onSubmit(): Promise<void> {
  if (!canSubmit.value) return
  await search({
    q: term.value.trim(),
    dateFrom: from.value || null,
    dateTo: to.value || null,
  })
}

async function onReset(): Promise<void> {
  term.value = ''
  from.value = null
  to.value = null
  advancedOpen.value = false
  await search({ q: '', dateFrom: null, dateTo: null })
}

// ─── SEO ─────────────────────────────────────────────────
useSeoMeta({
  title: () => `${t('nav.search')}${query.value ? ` — ${query.value}` : ''}`,
})
</script>

<template>
  <v-container
    class="py-8"
    style="max-width: 960px"
  >
    <h1 class="text-headline-medium font-weight-bold mb-6">
      {{ t('search.title') }}
    </h1>

    <!-- ─── Search input ─────────────────────────────────── -->
    <div class="mb-2">
      <v-text-field
        v-model="term"
        :placeholder="t('search.placeholder')"
        variant="solo-filled"
        density="comfortable"
        flat
        hide-details
        rounded="lg"
        prepend-inner-icon="mdi-magnify"
        autocomplete="off"
        :disabled="pending"
        @keydown.enter="onSubmit"
      >
        <template #append-inner>
          <v-btn
            color="primary"
            size="small"
            rounded="lg"
            :loading="pending"
            :disabled="!canSubmit"
            @click="onSubmit"
          >
            {{ t('search.action') }}
          </v-btn>
        </template>
      </v-text-field>
    </div>

    <!-- ─── Advanced toggle ──────────────────────────────── -->
    <div class="d-flex justify-end mb-2">
      <v-btn
        variant="text"
        size="small"
        :append-icon="advancedOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        :aria-expanded="String(advancedOpen)"
        aria-controls="advanced-search-panel"
        @click="toggleAdvanced"
      >
        {{ t('search.advanced') }}
      </v-btn>
    </div>

    <!-- ─── Advanced date filters ────────────────────────── -->
    <v-expand-transition>
      <div
        v-show="advancedOpen"
        id="advanced-search-panel"
        class="mb-8"
      >
        <v-sheet
          rounded="lg"
          border
          class="pa-4"
        >
          <div class="d-flex flex-column flex-sm-row ga-3">
            <v-text-field
              v-model="from"
              type="date"
              :label="t('search.dateFrom')"
              variant="outlined"
              density="comfortable"
              hide-details
              rounded="lg"
              clearable
            />
            <v-text-field
              v-model="to"
              type="date"
              :label="t('search.dateTo')"
              variant="outlined"
              density="comfortable"
              hide-details
              rounded="lg"
              clearable
            />
          </div>
          <div class="d-flex ga-2 mt-3">
            <v-btn
              color="primary"
              variant="flat"
              rounded="lg"
              :loading="pending"
              :disabled="!canSubmit"
              @click="onSubmit"
            >
              {{ t('search.action') }}
            </v-btn>
            <v-btn
              variant="text"
              rounded="lg"
              :disabled="pending"
              @click="onReset"
            >
              {{ t('common.cancel') }}
            </v-btn>
          </div>
        </v-sheet>
      </div>
    </v-expand-transition>

    <!-- ─── Loading ──────────────────────────────────────── -->
    <div
      v-if="pending"
      class="d-flex justify-center py-12"
    >
      <v-progress-circular
        indeterminate
        color="primary"
      />
    </div>

    <!-- ─── Results ──────────────────────────────────────── -->
    <template v-else-if="articles.length">
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{ t('search.resultsCount', { count: total, query }) }}
      </p>
      <div class="d-flex flex-column ga-4">
        <article-card
          v-for="article in articles"
          :key="article.id"
          :article="article"
          variant="horizontal"
        />
      </div>
    </template>

    <!-- ─── No results ───────────────────────────────────── -->
    <v-empty-state
      v-else-if="isEmpty"
      icon="mdi-magnify-close"
      :title="t('search.noResultsTitle')"
      :text="t('search.noResultsText', { query: query })"
    />

    <!-- ─── Idle — no query yet ──────────────────────────── -->
    <v-empty-state
      v-else-if="!hasQuery"
      icon="mdi-magnify"
      :title="t('search.prompt')"
      :text="t('search.placeholder')"
    />
  </v-container>
</template>
