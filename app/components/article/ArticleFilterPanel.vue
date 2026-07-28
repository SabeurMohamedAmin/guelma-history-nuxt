<script setup lang="ts">
import type { CategoryTree } from '~~/shared/types/category'

/**
 * ArticleFilterPanel — presentation-only filter controls for the articles page.
 *
 * Two-way binds the free-text search term and the selected category slug. It
 * holds no data and does no fetching, so it can be dropped into any listing.
 * Categories are passed in by the parent (which owns the fetch).
 */
const searchTerm = defineModel<string>('search', { required: true })
const category = defineModel<string | null>('category', { required: true })

const props = withDefaults(defineProps<{
  categories: CategoryTree[]
  /** Whether any filter is currently active (enables the "clear" button). */
  hasActiveFilters?: boolean
}>(), {
  hasActiveFilters: false,
})

const emit = defineEmits<{
  clear: []
}>()

const { locale, t } = useI18n()

// Build the category options in the active locale, with an "all" entry first.
const categoryOptions = computed(() => {
  const all = { value: null as string | null, title: t('articles.allCategories') }
  const mapped = props.categories.map(c => ({
    value: c.slug,
    title: locale.value === 'ar' ? c.nameAr : c.nameFr,
  }))
  return [all, ...mapped]
})

// Two-step confirm so a single stray click (e.g. right after picking a
// category) can never wipe every filter by accident. The first click arms the
// button; a second click within the window confirms. It auto-disarms on its
// own, and resets whenever the filters change underneath it.
const CONFIRM_WINDOW_MS = 2500
const armed = ref(false)
let disarmTimer: ReturnType<typeof setTimeout> | null = null

function clearDisarmTimer() {
  if (disarmTimer) {
    clearTimeout(disarmTimer)
    disarmTimer = null
  }
}

function disarm() {
  armed.value = false
  clearDisarmTimer()
}

function onClearClick() {
  if (!armed.value) {
    // First click: arm and start the auto-disarm countdown.
    armed.value = true
    clearDisarmTimer()
    disarmTimer = setTimeout(disarm, CONFIRM_WINDOW_MS)
    return
  }
  // Second click within the window: actually clear.
  disarm()
  emit('clear')
}

// If filters get cleared (or change) by other means, drop the armed state.
watch(() => props.hasActiveFilters, (active) => {
  if (!active) disarm()
})

const clearLabel = computed(() =>
  armed.value ? t('articles.confirmClearFilters') : t('articles.clearFilters'),
)

onBeforeUnmount(clearDisarmTimer)
</script>

<template>
  <div class="article-filter-panel d-flex flex-wrap align-center ga-3">
    <!-- Free-text search -->
    <v-text-field
      v-model="searchTerm"
      :placeholder="t('articles.searchPlaceholder')"
      :aria-label="t('articles.searchPlaceholder')"
      prepend-inner-icon="mdi-magnify"
      variant="solo-filled"
      density="comfortable"
      rounded="lg"
      flat
      hide-details
      clearable
      class="article-filter-panel__search"
    />

    <!-- Category filter -->
    <v-select
      v-model="category"
      :items="categoryOptions"
      :aria-label="t('articles.filterByCategory')"
      item-title="title"
      item-value="value"
      prepend-inner-icon="mdi-shape-outline"
      variant="solo-filled"
      density="comfortable"
      rounded="lg"
      flat
      hide-details
      class="article-filter-panel__category"
    />

    <!--
      Clear all filters. Always mounted (only toggled via visibility/disabled)
      so it never shifts the layout under the cursor when a filter becomes
      active. Requires a confirm tap to avoid accidental resets.
    -->
    <v-btn
      :variant="armed ? 'tonal' : 'text'"
      :color="armed ? 'error' : 'primary'"
      :disabled="!props.hasActiveFilters"
      rounded="lg"
      size="small"
      class="text-none article-filter-panel__clear"
      :class="{ 'article-filter-panel__clear--hidden': !props.hasActiveFilters }"
      @click="onClearClick"
    >
      <v-icon
        start
        :icon="armed ? 'mdi-alert-circle-outline' : 'mdi-filter-remove-outline'"
        size="18"
      />
      {{ clearLabel }}
    </v-btn>
  </div>
</template>

<style scoped>
.article-filter-panel__search {
  flex: 1 1 280px;
  min-width: 220px;
}

.article-filter-panel__category {
  flex: 0 1 240px;
  min-width: 200px;
}

/*
 * Keep the clear button in the layout at all times so selecting a filter does
 * not reflow the row. When there is nothing to clear it is simply invisible and
 * non-interactive, which removes the accidental-click trap entirely.
 */
.article-filter-panel__clear {
  transition: opacity 0.2s ease;
}

.article-filter-panel__clear--hidden {
  opacity: 0;
  pointer-events: none;
}
</style>
