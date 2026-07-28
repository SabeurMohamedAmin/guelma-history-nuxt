<script setup lang="ts">
import type { ArticleResponse, PaginatedResponse } from '~~/server/types/article.types'

/**
 * Shared article list view for the dashboard "My articles" / "All articles"
 * windows (author + admin). One implementation, configured by props:
 *
 * - `fetcher`     : returns a paginated article list for the active filters.
 * - `editable`    : true shows edit/delete actions; false shows a read-only
 *                   "open in new tab" link to the public article page.
 * - `showStatusFilter` : hide the status filter on published-only views so it is
 *                   not a dead control.
 * - `editBasePath`/`publicBasePath` : route prefixes for the row actions.
 * - `mineTo`/`allTo` (+ labels) : the two window routes for the segmented nav.
 * - `deleteArticle` : optional; required when `editable` is true.
 * - `categoriesEndpoint` : API path for the category filter options.
 *
 * Filters live in the URL query so the view is shareable and survives a refresh.
 * The URL is the single source of truth: the UI binds to a reactive `filters`
 * object, any change is pushed to the route, and the route watcher refetches.
 */

type StatusFilter = 'all' | 'published' | 'draft'
type SortByOption = 'createdAt' | 'publishedAt' | 'title'
type SortOrder = 'asc' | 'desc'

/** One option of the category filter, as returned by `categoriesEndpoint`. */
interface CategoryFilterOption {
  slug: string
  nameAr: string
  nameFr: string
}

interface ArticlesQuery {
  page?: number
  limit?: number
  search?: string
  category?: string
  status?: StatusFilter
  sortBy?: string
  sortOrder?: SortOrder
}

const props = withDefaults(defineProps<{
  /** Fetches a page of articles for the given query. */
  fetcher: (params: ArticlesQuery) => Promise<PaginatedResponse<ArticleResponse>>
  /** Shared loading flag from the owning composable. */
  loading: boolean
  /** Shared error message from the owning composable. */
  error: string | null
  /** Edit/delete actions (true) vs read-only open-in-new link (false). */
  editable: boolean
  /** Show the published/draft/all status filter. */
  showStatusFilter?: boolean
  /** Route prefix for the edit link, e.g. '/author/articles'. */
  editBasePath: string
  /** Route prefix for the public article page, e.g. '/articles'. */
  publicBasePath?: string
  /** "My articles" window route. */
  mineTo: string
  /** "All articles" window route. */
  allTo: string
  /** Route prefix for the "new article" button. */
  createTo: string
  /** API endpoint returning the category list for the filter. */
  categoriesEndpoint: string
  /** Delete handler, required when `editable`. */
  deleteArticle?: (slug: string) => Promise<unknown>
}>(), {
  showStatusFilter: true,
  publicBasePath: '/articles',
})

const SEARCH_MIN_CHARS = 3
const SEARCH_DEBOUNCE_MS = 150
const PER_PAGE = 10

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

const articles = ref<ArticleResponse[]>([])
const total = ref(0)
const categories = ref<CategoryFilterOption[]>([])

const deleteDialog = ref(false)
const deletingSlug = ref<string | null>(null)
const snackbar = ref<{ show: boolean, text: string, color: string }>({ show: false, text: '', color: 'success' })

/** Reactive view of the filters, hydrated from the URL query. */
const filters = reactive({
  search: getQueryString('search'),
  category: getQueryString('category'),
  status: (getQueryString('status') || 'all') as StatusFilter,
  sortBy: (getQueryString('sortBy') || 'createdAt') as SortByOption,
  sortOrder: (getQueryString('sortOrder') || 'desc') as SortOrder,
  page: Number(getQueryString('page')) || 1,
})

const statusOptions = computed(() => [
  { value: 'all', title: t('articles.allStatuses') },
  { value: 'published', title: t('admin.status.published') },
  { value: 'draft', title: t('admin.status.draft') },
])

const sortByOptions = computed(() => [
  { value: 'createdAt', title: t('articles.sortCreated') },
  { value: 'publishedAt', title: t('article.publishedAt') },
  { value: 'title', title: t('articles.sortTitle') },
])

const categoryOptions = computed(() =>
  categories.value.map(category => ({ value: category.slug, title: category.nameAr })),
)

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PER_PAGE)))

const tableHeaders = computed(() => [
  { title: t('article.coverImage'), key: 'coverImage', sortable: false, width: '88' },
  { title: t('article.titleAr'), key: 'titleAr', sortable: false },
  { title: t('article.titleFr'), key: 'titleFr', sortable: false },
  { title: t('nav.categories'), key: 'category', sortable: false },
  { title: t('article.publishedAt'), key: 'publishedAt', sortable: false },
  { title: '', key: 'actions', sortable: false, align: 'end' as const },
])

/** Active filters rendered as removable chips. */
const activeChips = computed(() => {
  const chips: { key: string, label: string }[] = []

  if (filters.search) {
    chips.push({ key: 'search', label: `${t('common.search')}: ${filters.search}` })
  }
  if (filters.category) {
    const found = categoryOptions.value.find(option => option.value === filters.category)
    chips.push({ key: 'category', label: `${t('nav.categories')}: ${found?.title ?? filters.category}` })
  }
  if (props.showStatusFilter && filters.status !== 'all') {
    const found = statusOptions.value.find(option => option.value === filters.status)
    chips.push({ key: 'status', label: `${t('common.status')}: ${found?.title}` })
  }

  return chips
})

function getQueryString(key: string): string {
  const value = route.query[key]
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '')
}

/** Push the current filters to the URL; the route watcher loads the data. */
function syncUrl() {
  const query: Record<string, string> = {}

  if (filters.search) query.search = filters.search
  if (filters.category) query.category = filters.category
  if (props.showStatusFilter && filters.status !== 'all') query.status = filters.status
  if (filters.sortBy !== 'createdAt') query.sortBy = filters.sortBy
  if (filters.sortOrder !== 'desc') query.sortOrder = filters.sortOrder
  if (filters.page > 1) query.page = String(filters.page)

  router.replace({ query })
}

/** Reset to page 1 whenever a filter (other than the page itself) changes. */
function onFilterChange() {
  filters.page = 1
  syncUrl()
}

function removeChip(key: string) {
  if (key === 'search') filters.search = ''
  if (key === 'category') filters.category = ''
  if (key === 'status') filters.status = 'all'
  onFilterChange()
}

function clearFilters() {
  filters.search = ''
  filters.category = ''
  filters.status = 'all'
  filters.sortBy = 'createdAt'
  filters.sortOrder = 'desc'
  filters.page = 1
  syncUrl()
}

async function loadArticles() {
  const result = await props.fetcher({
    page: filters.page,
    limit: PER_PAGE,
    search: filters.search.length >= SEARCH_MIN_CHARS ? filters.search : undefined,
    category: filters.category || undefined,
    // Only send a status filter on views that expose it; published-only views
    // are scoped server-side and ignore it.
    status: props.showStatusFilter ? filters.status : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  })

  articles.value = result.data
  total.value = result.pagination.total
}

async function loadCategories() {
  // The endpoint is a plain string prop, so the request generic is pinned to
  // `string`. Left to infer, $fetch compares it against every generated route
  // and TypeScript gives up with "excessive stack depth" (TS2321).
  categories.value = await $fetch<CategoryFilterOption[], string>(props.categoriesEndpoint)
}

async function onDeleteConfirm() {
  if (!deletingSlug.value || !props.deleteArticle) return
  try {
    await props.deleteArticle(deletingSlug.value)
    notify(t('admin.articleDeleted'))
    await loadArticles()
  }
  catch {
    notify(t('admin.deleteFailed'), 'error')
  }
  finally {
    deleteDialog.value = false
    deletingSlug.value = null
  }
}

function promptDelete(slug: string) {
  deletingSlug.value = slug
  deleteDialog.value = true
}

function notify(text: string, color: 'success' | 'error' = 'success') {
  snackbar.value = { show: true, text, color }
}

// Debounced search: only sync once the user pauses and typed enough characters
// (or fully cleared the field).
const debouncedSearchSync = useDebounceFn(() => {
  if (filters.search.length === 0 || filters.search.length >= SEARCH_MIN_CHARS) {
    onFilterChange()
  }
}, SEARCH_DEBOUNCE_MS)

// The URL query is the single source of truth: react to it and reload.
watch(() => route.query, loadArticles, { deep: true })

onMounted(() => {
  loadCategories()
  loadArticles()
})
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6">
      <h1 class="text-headline-medium font-weight-bold">
        {{ t('admin.articles') }}
      </h1>
      <v-btn
        color="primary"
        :to="localePath(createTo)"
        prepend-icon="mdi-plus"
      >
        {{ t('admin.newArticle') }}
      </v-btn>
    </div>

    <!-- Window switch: My articles / All articles as route links. -->
    <v-tabs
      color="primary"
      class="mb-4"
    >
      <v-tab
        :to="localePath(mineTo)"
        exact
      >
        {{ t('common.myArticles') }}
      </v-tab>
      <v-tab
        :to="localePath(allTo)"
        exact
      >
        {{ t('common.allArticles') }}
      </v-tab>
    </v-tabs>

    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      {{ error }}
    </v-alert>

    <v-card
      rounded="lg"
      class="mb-4"
    >
      <v-card-text>
        <v-row
          density="comfortable"
          align="start"
        >
          <v-col
            cols="12"
            sm="8"
            :md="showStatusFilter ? 4 : 5"
          >
            <v-text-field
              v-model="filters.search"
              :label="t('common.search')"
              :hint="t('articles.searchHint', { min: SEARCH_MIN_CHARS })"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="comfortable"
              clearable
              hide-details="auto"
              @update:model-value="debouncedSearchSync"
            />
          </v-col>

          <v-col
            v-if="showStatusFilter"
            cols="6"
            sm="4"
            md="2"
          >
            <v-select
              v-model="filters.status"
              :label="t('common.status')"
              :items="statusOptions"
              variant="outlined"
              density="comfortable"
              hide-details
              @update:model-value="onFilterChange"
            />
          </v-col>

          <v-col
            cols="6"
            sm="5"
            md="3"
          >
            <v-select
              v-model="filters.category"
              :label="t('nav.categories')"
              :items="categoryOptions"
              variant="outlined"
              density="comfortable"
              clearable
              hide-details
              @update:model-value="onFilterChange"
            />
          </v-col>

          <v-col
            cols="9"
            sm="5"
            md="2"
          >
            <v-select
              v-model="filters.sortBy"
              :label="t('articles.sortBy')"
              :items="sortByOptions"
              variant="outlined"
              density="comfortable"
              hide-details
              @update:model-value="onFilterChange"
            />
          </v-col>

          <v-col
            cols="3"
            sm="2"
            md="1"
            class="d-flex justify-end align-start"
          >
            <v-btn
              class="border"
              variant="plain"
              rounded="lg"
              size="default"
              :icon="filters.sortOrder === 'asc' ? 'mdi-sort-ascending' : 'mdi-sort-descending'"
              :title="t('articles.toggleOrder')"
              @click="filters.sortOrder = filters.sortOrder === 'asc' ? 'desc' : 'asc'; onFilterChange()"
            />
          </v-col>
        </v-row>

        <div class="d-flex flex-wrap align-center ga-2 mt-3">
          <v-chip
            v-for="chip in activeChips"
            :key="chip.key"
            closable
            size="small"
            color="primary"
            variant="tonal"
            @click:close="removeChip(chip.key)"
          >
            {{ chip.label }}
          </v-chip>

          <v-btn
            variant="text"
            size="small"
            color="medium-emphasis"
            prepend-icon="mdi-filter-off"
            @click="clearFilters"
          >
            {{ t('articles.clearFilters') }}
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <v-card rounded="lg">
      <v-data-table
        :headers="tableHeaders"
        :items="articles"
        :loading="loading"
        hide-default-footer
      >
        <template #[`item.coverImage`]="{ item }">
          <v-img
            v-if="item.coverImage"
            :src="item.coverImage"
            :alt="item.titleFr"
            width="64"
            height="40"
            cover
            class="rounded my-1"
          />
          <v-avatar
            v-else
            size="40"
            rounded="lg"
            color="grey-lighten-3"
          >
            <v-icon
              size="small"
              color="grey"
            >
              mdi-image-off-outline
            </v-icon>
          </v-avatar>
        </template>

        <template #[`item.category`]="{ item }">
          <v-chip
            v-if="item.category"
            size="x-small"
            color="primary"
            variant="tonal"
          >
            {{ item.category.nameAr }}
          </v-chip>
          <span
            v-else
            class="text-medium-emphasis"
          >—</span>
        </template>

        <template #[`item.publishedAt`]="{ item }">
          <span v-if="item.publishedAt">{{ new Date(item.publishedAt).toLocaleDateString() }}</span>
          <v-chip
            v-else
            size="x-small"
            variant="tonal"
          >
            {{ t('admin.draft') }}
          </v-chip>
        </template>

        <template #[`item.actions`]="{ item }">
          <template v-if="editable">
            <v-btn
              icon="mdi-open-in-new"
              variant="text"
              size="small"
              :title="t('article.viewArticle')"
              :aria-label="t('article.viewArticle')"
              :href="localePath(`${publicBasePath}/${item.slug}`)"
              target="_blank"
              rel="noopener"
            />
            <v-btn
              icon="mdi-pencil"
              variant="text"
              size="small"
              :to="{ path: localePath(`${editBasePath}/${item.slug}`), query: route.query }"
            />
            <v-btn
              icon="mdi-delete"
              variant="text"
              size="small"
              color="error"
              @click="promptDelete(item.slug)"
            />
          </template>
          <v-btn
            v-else
            icon="mdi-open-in-new"
            variant="text"
            size="small"
            :href="localePath(`${publicBasePath}/${item.slug}`)"
            target="_blank"
            rel="noopener"
          />
        </template>

        <template #no-data>
          <div class="text-center text-medium-emphasis py-8">
            {{ t('common.noResults') }}
          </div>
        </template>
      </v-data-table>
    </v-card>

    <div class="d-flex justify-center mt-4">
      <v-pagination
        v-model="filters.page"
        :length="pageCount"
        density="compact"
        @update:model-value="syncUrl"
      />
    </div>

    <v-dialog
      v-if="editable"
      v-model="deleteDialog"
      max-width="400"
    >
      <v-card rounded="lg">
        <v-card-title class="text-headline-small pt-4">
          {{ t('admin.confirmDelete') }}
        </v-card-title>
        <v-card-text>{{ t('admin.confirmDeleteText') }}</v-card-text>
        <v-card-actions class="pb-4 px-4">
          <v-spacer />
          <v-btn
            variant="text"
            @click="deleteDialog = false"
          >
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            :loading="loading"
            @click="onDeleteConfirm"
          >
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </div>
</template>
