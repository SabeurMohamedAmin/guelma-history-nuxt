<script setup lang="ts">
import type { CategoryTree } from '~~/shared/types/category'

/**
 * SearchForm — the hero search bar plus a collapsible filter panel.
 *
 * Presentation only: it two-way binds the four search inputs and asks the
 * parent page to run the search. No data fetching happens here, so the form
 * can be reused anywhere a search entry point is needed.
 */
const term = defineModel<string>('term', { required: true })
const category = defineModel<string | null>('category', { required: true })
const dateFrom = defineModel<string | null>('dateFrom', { required: true })
const dateTo = defineModel<string | null>('dateTo', { required: true })

const props = withDefaults(defineProps<{
  /** Categories offered by the category filter. */
  categories: CategoryTree[]
  /** True while a request is in flight: disables the controls. */
  pending?: boolean
}>(), {
  pending: false,
})

const emit = defineEmits<{
  submit: []
  reset: []
}>()

const { t, locale } = useI18n()

// Open on arrival when the URL already carries a filter, so the user always
// sees which criteria produced the results on screen.
const filtersOpen = ref(Boolean(category.value || dateFrom.value || dateTo.value))

const canSubmit = computed(() => Boolean(term.value?.trim()))

// "All categories" first, then one option per category in the active locale.
const categoryOptions = computed(() => [
  { value: null as string | null, title: t('articles.allCategories') },
  ...props.categories.map(item => ({
    value: item.slug,
    title: locale.value === 'ar' ? item.nameAr : item.nameFr,
  })),
])

// Shown as a counter on the toggle so collapsed filters are never invisible.
const activeFilterCount = computed(() =>
  [category.value, dateFrom.value, dateTo.value].filter(Boolean).length,
)

function toggleFilters(): void {
  filtersOpen.value = !filtersOpen.value
}

function onSubmit(): void {
  if (!canSubmit.value) return
  emit('submit')
}

// Vuetify's clearable sets the model to null; keep it an empty string.
function onClear(): void {
  term.value = ''
}
</script>

<template>
  <v-form
    role="search"
    :aria-label="t('search.title')"
    @submit.prevent="onSubmit"
  >
    <!-- ─── Query bar ────────────────────────────────────── -->
    <div class="d-flex flex-column flex-sm-row ga-3">
      <v-text-field
        v-model="term"
        type="search"
        enterkeyhint="search"
        autocomplete="off"
        :placeholder="t('search.placeholder')"
        :aria-label="t('search.inputLabel')"
        prepend-inner-icon="mdi-magnify"
        variant="solo"
        density="comfortable"
        rounded="xl"
        flat
        single-line
        hide-details
        clearable
        :disabled="pending"
        class="search-form__field flex-grow-1"
        @click:clear="onClear"
      />

      <v-btn
        type="submit"
        color="primary"
        rounded="xl"
        size="large"
        height="52"
        min-width="140"
        class="text-none font-weight-bold px-6"
        :loading="pending"
        :disabled="!canSubmit"
      >
        {{ t('search.action') }}
      </v-btn>
    </div>

    <!-- ─── Filters toggle ───────────────────────────────── -->
    <div class="d-flex justify-center justify-sm-start mt-3">
      <v-btn
        variant="text"
        size="small"
        rounded="lg"
        class="text-none"
        :aria-expanded="String(filtersOpen)"
        aria-controls="search-filters-panel"
        :append-icon="filtersOpen ? 'mdi-chevron-up' : 'mdi-chevron-down'"
        @click="toggleFilters"
      >
        <v-icon
          start
          icon="mdi-tune-variant"
          size="18"
        />
        {{ t('search.filters') }}

        <v-chip
          v-if="activeFilterCount"
          size="x-small"
          color="primary"
          variant="flat"
          class="ms-2"
        >
          {{ activeFilterCount }}
        </v-chip>
      </v-btn>
    </div>

    <!-- ─── Filter panel ─────────────────────────────────── -->
    <v-expand-transition>
      <div
        v-show="filtersOpen"
        id="search-filters-panel"
      >
        <v-sheet
          rounded="lg"
          border
          class="pa-4 mt-2"
        >
          <div class="d-flex flex-column flex-md-row ga-3">
            <v-select
              v-model="category"
              :items="categoryOptions"
              :label="t('search.category')"
              item-title="title"
              item-value="value"
              prepend-inner-icon="mdi-shape-outline"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details
              :disabled="pending"
            />

            <v-text-field
              v-model="dateFrom"
              type="date"
              :label="t('search.dateFrom')"
              :max="dateTo ?? undefined"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details
              clearable
              :disabled="pending"
            />

            <v-text-field
              v-model="dateTo"
              type="date"
              :label="t('search.dateTo')"
              :min="dateFrom ?? undefined"
              variant="outlined"
              density="comfortable"
              rounded="lg"
              hide-details
              clearable
              :disabled="pending"
            />
          </div>

          <div class="d-flex flex-wrap ga-2 mt-4">
            <v-btn
              type="submit"
              color="primary"
              variant="flat"
              rounded="lg"
              class="text-none"
              :loading="pending"
              :disabled="!canSubmit"
            >
              {{ t('search.apply') }}
            </v-btn>

            <v-btn
              variant="text"
              rounded="lg"
              class="text-none"
              :disabled="pending"
              @click="emit('reset')"
            >
              <v-icon
                start
                icon="mdi-filter-off-outline"
                size="18"
              />
              {{ t('search.clearAll') }}
            </v-btn>
          </div>
        </v-sheet>
      </div>
    </v-expand-transition>
  </v-form>
</template>

<style scoped>
/* A soft, self-contained field: it must stay readable on the tinted hero. */
.search-form__field :deep(.v-field) {
  min-height: 52px;
  background-color: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), 0.14);
  box-shadow: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

/* A 4px ring instead of the default outline: visible in both themes and on
   keyboard focus, without shifting the layout. */
.search-form__field :deep(.v-field--focused) {
  border-color: rgba(var(--v-theme-primary), 0.45);
  box-shadow: 0 0 0 4px rgba(var(--v-theme-primary), 0.12);
}

@media (prefers-reduced-motion: reduce) {
  .search-form__field :deep(.v-field) {
    transition: none;
  }
}
</style>
