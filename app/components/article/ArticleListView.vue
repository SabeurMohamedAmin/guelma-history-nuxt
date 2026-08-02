<script setup lang="ts">
import type { ArticleResponse, PaginatedResponse } from '~~/server/types/article.types'

type StatusFilter = 'all' | 'published' | 'draft'
type SortByOption = 'createdAt' | 'publishedAt' | 'title'
type SortOrder = 'asc' | 'desc'
type NotificationColor = 'success' | 'error'

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
  sortBy?: SortByOption
  sortOrder?: SortOrder
}

interface FilterChip {
  key: 'search' | 'category' | 'status'
  label: string
}

const props = withDefaults(defineProps<{
  fetcher: (params: ArticlesQuery) => Promise<PaginatedResponse<ArticleResponse>>
  loading: boolean
  error: string | null
  editable: boolean
  showStatusFilter?: boolean
  editBasePath: string
  publicBasePath?: string
  mineTo: string
  allTo: string
  createTo: string
  categoriesEndpoint: string
  deleteArticle?: (slug: string) => Promise<unknown>
  setHomePosition?: (slug: string, position: number | null) => Promise<unknown>
}>(), {
  showStatusFilter: true,
  publicBasePath: '/articles',
})

const SEARCH_MIN_CHARS = 3
const SEARCH_DEBOUNCE_MS = 300
const PER_PAGE = 10

const { t, locale } = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()

const articles = ref<ArticleResponse[]>([])
const total = ref(0)
const categories = ref<CategoryFilterOption[]>([])

const deleteDialog = ref(false)
const deletingSlug = ref<string | null>(null)
const deleting = ref(false)

const updatingHomeSlug = ref<string | null>(null)

const snackbar = ref({
  show: false,
  text: '',
  color: 'success' as NotificationColor,
})

/* -------------------------------------------------------------------------- */
/* Filters                                                                    */
/* -------------------------------------------------------------------------- */

const filters = reactive({
  search: getQueryString('search'),
  category: getQueryString('category'),
  status: (getQueryString('status') || 'all') as StatusFilter,
  sortBy: (getQueryString('sortBy') || 'createdAt') as SortByOption,
  sortOrder: (getQueryString('sortOrder') || 'desc') as SortOrder,
  page: Number(getQueryString('page')) || 1,
})

const statusOptions = computed(() => [
  {
    value: 'all' as const,
    title: t('articles.allStatuses'),
  },
  {
    value: 'published' as const,
    title: t('admin.status.published'),
  },
  {
    value: 'draft' as const,
    title: t('admin.status.draft'),
  },
])

const sortByOptions = computed(() => [
  {
    value: 'createdAt' as const,
    title: t('articles.sortCreated'),
  },
  {
    value: 'publishedAt' as const,
    title: t('article.publishedAt'),
  },
  {
    value: 'title' as const,
    title: t('articles.sortTitle'),
  },
])

const categoryOptions = computed(() => {
  return categories.value.map(category => ({
    value: category.slug,
    title: locale.value === 'fr'
      ? category.nameFr
      : category.nameAr,
  }))
})

const homePositionOptions = [
  { value: null, title: 'Not featured' },
  { value: 0, title: 'Main article' },
  { value: 1, title: 'Sub-main 1' },
  { value: 2, title: 'Sub-main 2' },
  { value: 3, title: 'Sub-main 3' },
]

/* -------------------------------------------------------------------------- */
/* Derived state                                                              */
/* -------------------------------------------------------------------------- */

const pageCount = computed(() => {
  return Math.max(1, Math.ceil(total.value / PER_PAGE))
})

const hasActiveFilters = computed(() => {
  return Boolean(
    filters.search
    || filters.category
    || (props.showStatusFilter && filters.status !== 'all'),
  )
})

const resultStart = computed(() => {
  if (total.value === 0) {
    return 0
  }

  return (filters.page - 1) * PER_PAGE + 1
})

const resultEnd = computed(() => {
  return Math.min(filters.page * PER_PAGE, total.value)
})

const selectedArticle = computed(() => {
  if (!deletingSlug.value) {
    return null
  }

  return articles.value.find(
    article => article.slug === deletingSlug.value,
  ) ?? null
})

const tableHeaders = computed(() => [
  {
    title: t('article.coverImage'),
    key: 'coverImage',
    sortable: false,
    width: 80,
  },
  {
    title: t('article.titleAr'),
    key: 'titleAr',
    sortable: false,
  },
  {
    title: t('article.titleFr'),
    key: 'titleFr',
    sortable: false,
  },
  {
    title: t('nav.categories'),
    key: 'category',
    sortable: false,
    width: 150,
  },
  {
    title: t('article.publishedAt'),
    key: 'publishedAt',
    sortable: false,
    width: 150,
  },
  ...(props.setHomePosition
    ? [{
        title: 'Home page',
        key: 'homePosition',
        sortable: false,
        width: 180,
      }]
    : []),
  {
    title: '',
    key: 'actions',
    sortable: false,
    align: 'end' as const,
    width: props.editable ? 96 : 52,
  },
])

const activeChips = computed<FilterChip[]>(() => {
  const chips: FilterChip[] = []

  if (filters.search) {
    chips.push({
      key: 'search',
      label: `${t('common.search')}: ${filters.search}`,
    })
  }

  if (filters.category) {
    const category = categoryOptions.value.find(
      option => option.value === filters.category,
    )

    chips.push({
      key: 'category',
      label: `${t('nav.categories')}: ${category?.title ?? filters.category}`,
    })
  }

  if (props.showStatusFilter && filters.status !== 'all') {
    const status = statusOptions.value.find(
      option => option.value === filters.status,
    )

    chips.push({
      key: 'status',
      label: `${t('common.status')}: ${status?.title ?? filters.status}`,
    })
  }

  return chips
})

/* -------------------------------------------------------------------------- */
/* URL state                                                                  */
/* -------------------------------------------------------------------------- */

function getQueryString(key: string): string {
  const value = route.query[key]

  return Array.isArray(value)
    ? (value[0] ?? '')
    : (value ?? '')
}

function syncUrl() {
  const query: Record<string, string> = {}

  if (filters.search) {
    query.search = filters.search
  }

  if (filters.category) {
    query.category = filters.category
  }

  if (props.showStatusFilter && filters.status !== 'all') {
    query.status = filters.status
  }

  if (filters.sortBy !== 'createdAt') {
    query.sortBy = filters.sortBy
  }

  if (filters.sortOrder !== 'desc') {
    query.sortOrder = filters.sortOrder
  }

  if (filters.page > 1) {
    query.page = String(filters.page)
  }

  router.replace({ query })
}

function onFilterChange() {
  filters.page = 1
  syncUrl()
}

function onPageChange() {
  syncUrl()
}

function toggleSortOrder() {
  filters.sortOrder = filters.sortOrder === 'asc'
    ? 'desc'
    : 'asc'

  onFilterChange()
}

function removeChip(key: FilterChip['key']) {
  if (key === 'search') {
    filters.search = ''
  }

  if (key === 'category') {
    filters.category = ''
  }

  if (key === 'status') {
    filters.status = 'all'
  }

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

/* -------------------------------------------------------------------------- */
/* Data                                                                       */
/* -------------------------------------------------------------------------- */

async function loadArticles() {
  const result = await props.fetcher({
    page: filters.page,
    limit: PER_PAGE,
    search: filters.search.trim().length >= SEARCH_MIN_CHARS
      ? filters.search.trim()
      : undefined,
    category: filters.category || undefined,
    status: props.showStatusFilter
      ? filters.status
      : undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  })

  articles.value = result.data
  total.value = result.pagination.total
}

async function loadCategories() {
  try {
    categories.value = await $fetch<CategoryFilterOption[], string>(
      props.categoriesEndpoint,
    )
  }
  catch {
    categories.value = []
  }
}

/* -------------------------------------------------------------------------- */
/* Delete                                                                     */
/* -------------------------------------------------------------------------- */

function promptDelete(slug: string) {
  deletingSlug.value = slug
  deleteDialog.value = true
}

function closeDeleteDialog() {
  if (deleting.value) {
    return
  }

  deleteDialog.value = false
  deletingSlug.value = null
}

async function onDeleteConfirm() {
  if (
    !deletingSlug.value
    || !props.deleteArticle
    || deleting.value
  ) {
    return
  }

  deleting.value = true

  try {
    await props.deleteArticle(deletingSlug.value)

    notify(t('admin.articleDeleted'))

    const shouldGoToPreviousPage
      = articles.value.length === 1 && filters.page > 1

    deleteDialog.value = false
    deletingSlug.value = null

    if (shouldGoToPreviousPage) {
      filters.page -= 1
      syncUrl()
      return
    }

    await loadArticles()
  }
  catch {
    notify(t('admin.deleteFailed'), 'error')
  }
  finally {
    deleting.value = false
  }
}

/* -------------------------------------------------------------------------- */
/* Home page placement                                                        */
/* -------------------------------------------------------------------------- */

async function updateHomePosition(
  article: ArticleResponse,
  position: number | null,
) {
  if (!props.setHomePosition) {
    return
  }

  updatingHomeSlug.value = article.slug

  try {
    await props.setHomePosition(article.slug, position)

    notify('Home-page placement updated.')
    await loadArticles()
  }
  catch {
    notify('Could not update the home-page placement.', 'error')
  }
  finally {
    updatingHomeSlug.value = null
  }
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat(locale.value, {
    dateStyle: 'medium',
  }).format(new Date(value))
}

function notify(
  text: string,
  color: NotificationColor = 'success',
) {
  snackbar.value = {
    show: true,
    text,
    color,
  }
}

const debouncedSearchSync = useDebounceFn(() => {
  const searchLength = filters.search.trim().length

  if (
    searchLength === 0
    || searchLength >= SEARCH_MIN_CHARS
  ) {
    onFilterChange()
  }
}, SEARCH_DEBOUNCE_MS)

/* -------------------------------------------------------------------------- */
/* Watchers                                                                   */
/* -------------------------------------------------------------------------- */

watch(
  () => route.query,
  loadArticles,
  { deep: true },
)

onMounted(() => {
  loadCategories()
  loadArticles()
})
</script>

<template>
  <main class="articles-page">
    <!-- Page header -->
    <header class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
      <div>
        <h1 class="text-h4 font-weight-bold mb-1">
          {{ t('admin.articles') }}
        </h1>

        <p class="text-body-2 text-medium-emphasis mb-0">
          {{ total }} {{ t('admin.articles') }}
        </p>
      </div>

      <v-btn
        :to="localePath(createTo)"
        color="primary"
        prepend-icon="mdi-plus"
        rounded="lg"
      >
        {{ t('admin.newArticle') }}
      </v-btn>
    </header>

    <!-- Article views -->
    <v-card
      variant="flat"
      :ripple="false"
      rounded="lg"
      class="mb-5 overflow-hidden"
    >
      <v-tabs
        color="primary"
        grow
        aria-label="Article views"
      >
        <v-tab
          :to="localePath(mineTo)"
          exact
          prepend-icon="mdi-account-outline"
        >
          {{ t('common.myArticles') }}
        </v-tab>

        <v-tab
          :to="localePath(allTo)"
          exact
          prepend-icon="mdi-file-document-multiple-outline"
        >
          {{ t('common.allArticles') }}
        </v-tab>
      </v-tabs>
    </v-card>

    <!-- Error -->
    <v-alert
      v-if="error"
      type="error"
      variant="tonal"
      rounded="lg"
      class="mb-5"
    >
      {{ error }}
    </v-alert>

    <!-- Filters -->
    <v-card
      variant="flat"
      :ripple="false"
      rounded="lg"
      class="mb-5"
    >
      <v-card-item>
        <template #prepend>
          <v-avatar
            color="primary"
            variant="tonal"
            size="36"
            rounded="lg"
          >
            <v-icon
              icon="mdi-tune-variant"
              size="20"
            />
          </v-avatar>
        </template>

        <v-card-title class="text-subtitle-1 font-weight-bold">
          {{ t('articles.filters') }}
        </v-card-title>

        <v-card-subtitle>
          {{ total }} {{ t('common.results') }}
        </v-card-subtitle>

        <template
          v-if="hasActiveFilters"
          #append
        >
          <v-btn
            variant="text"
            color="primary"
            size="small"
            prepend-icon="mdi-filter-off-outline"
            @click="clearFilters"
          >
            {{ t('articles.clearFilters') }}
          </v-btn>
        </template>
      </v-card-item>

      <v-card-text class="pt-2">
        <v-row>
          <!-- Search -->
          <v-col
            cols="12"
            lg="4"
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
              autocomplete="off"
              @update:model-value="debouncedSearchSync"
            />
          </v-col>

          <!-- Status -->
          <v-col
            v-if="showStatusFilter"
            cols="12"
            sm="6"
            lg="2"
          >
            <v-select
              v-model="filters.status"
              :label="t('common.status')"
              :items="statusOptions"
              prepend-inner-icon="mdi-list-status"
              variant="outlined"
              density="comfortable"
              hide-details
              @update:model-value="onFilterChange"
            />
          </v-col>

          <!-- Category -->
          <v-col
            cols="12"
            sm="6"
            :lg="showStatusFilter ? 3 : 4"
          >
            <v-select
              v-model="filters.category"
              :label="t('nav.categories')"
              :items="categoryOptions"
              prepend-inner-icon="mdi-shape-outline"
              variant="outlined"
              density="comfortable"
              clearable
              hide-details
              @update:model-value="onFilterChange"
            />
          </v-col>

          <!-- Sort -->
          <v-col
            cols="9"
            sm="10"
            :lg="showStatusFilter ? 2 : 3"
          >
            <v-select
              v-model="filters.sortBy"
              :label="t('articles.sortBy')"
              :items="sortByOptions"
              prepend-inner-icon="mdi-sort"
              variant="outlined"
              density="comfortable"
              hide-details
              @update:model-value="onFilterChange"
            />
          </v-col>

          <!-- Sort direction -->
          <v-col
            cols="3"
            sm="2"
            lg="1"
          >
            <v-btn
              :icon="filters.sortOrder === 'asc'
                ? 'mdi-sort-ascending'
                : 'mdi-sort-descending'"
              :title="t('articles.toggleOrder')"
              :aria-label="t('articles.toggleOrder')"
              variant="outlined"
              rounded="lg"
              height="48"
              block
              @click="toggleSortOrder"
            />
          </v-col>
        </v-row>

        <!-- Active filters -->
        <div
          v-if="activeChips.length"
          class="d-flex flex-wrap align-center ga-2 mt-3"
        >
          <span class="text-caption text-medium-emphasis">
            {{ t('articles.filters') }}:
          </span>

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
        </div>
      </v-card-text>
    </v-card>

    <!-- Articles list -->
    <section
      class="articles-section"
      aria-labelledby="articles-list-title"
    >
      <v-card
        variant="flat"
        :ripple="false"
        rounded="lg"
        class="overflow-hidden py-2 mb-5"
      >
        <!-- List header -->
        <v-card-item class="py-4">
          <template #prepend>
            <v-avatar
              color="primary"
              variant="tonal"
              size="38"
              rounded="lg"
            >
              <v-icon
                icon="mdi-file-document-multiple-outline"
                size="20"
              />
            </v-avatar>
          </template>

          <v-card-title
            id="articles-list-title"
            class="text-subtitle-1 font-weight-bold"
          >
            {{ t('admin.articles') }}
          </v-card-title>

          <v-card-subtitle>
            <template v-if="total">
              {{ resultStart }}–{{ resultEnd }} / {{ total }}
            </template>

            <template v-else-if="!loading">
              {{ t('common.noResults') }}
            </template>
          </v-card-subtitle>

          <template #append>
            <div class="d-flex align-center ga-2">
              <v-chip
                v-if="activeChips.length"
                color="primary"
                variant="tonal"
                size="small"
                prepend-icon="mdi-filter-outline"
              >
                {{ activeChips.length }}
              </v-chip>

              <v-progress-circular
                v-if="loading"
                indeterminate
                color="primary"
                size="20"
                width="2"
                aria-label="Loading articles"
              />
            </div>
          </template>
        </v-card-item>

        <v-divider />

        <!--
          Vuetify's data table manages its own horizontal overflow.
          Do not add another overflow-x wrapper around this component.
        -->
        <v-data-table
          :headers="tableHeaders"
          :items="articles"
          :loading="loading"
          item-value="slug"
          hide-default-footer
          hover
          class="articles-table "
        >
          <!-- Cover -->
          <template #[`item.coverImage`]="{ item }">
            <v-img
              v-if="item.coverImage"
              :src="item.coverImage"
              :alt="item.titleFr || item.titleAr"
              width="64"
              height="44"
              cover
              rounded="lg"
              class="bg-surface-variant"
            />

            <v-avatar
              v-else
              size="44"
              rounded="lg"
              color="surface-variant"
              class="my-2"
            >
              <v-icon
                icon="mdi-image-off-outline"
                color="medium-emphasis"
                size="20"
              />
            </v-avatar>
          </template>

          <!-- Arabic title -->
          <template #[`item.titleAr`]="{ item }">
            <div
              class="article-title"
              dir="rtl"
            >
              {{ item.titleAr }}
            </div>
          </template>

          <!-- French title -->
          <template #[`item.titleFr`]="{ item }">
            <div class="article-title">
              {{ item.titleFr }}
            </div>
          </template>

          <!-- Category -->
          <template #[`item.category`]="{ item }">
            <v-chip
              v-if="item.category"
              color="primary"
              variant="tonal"
              size="small"
            >
              {{
                locale === 'fr'
                  ? item.category.nameFr
                  : item.category.nameAr
              }}
            </v-chip>

            <span
              v-else
              class="text-medium-emphasis"
            >
              —
            </span>
          </template>

          <!-- Published -->
          <template #[`item.publishedAt`]="{ item }">
            <div
              v-if="item.publishedAt"
              class="d-flex align-center ga-2 text-no-wrap"
            >
              <v-icon
                icon="mdi-check-circle-outline"
                color="success"
                size="17"
              />

              <span class="text-body-2">
                {{ formatDate(item.publishedAt) }}
              </span>
            </div>

            <v-chip
              v-else
              color="warning"
              variant="tonal"
              size="small"
              prepend-icon="mdi-file-edit-outline"
            >
              {{ t('admin.draft') }}
            </v-chip>
          </template>

          <!-- Home position -->
          <template #[`item.homePosition`]="{ item }">
            <v-select
              :model-value="item.homePosition"
              :items="homePositionOptions"
              :disabled="!item.publishedAt"
              :loading="updatingHomeSlug === item.slug"
              density="compact"
              variant="outlined"
              hide-details
              aria-label="Home page position"
              class="home-position-select"
              @update:model-value="updateHomePosition(item, $event)"
            />
          </template>

          <!-- Actions -->
          <template #[`item.actions`]="{ item }">
            <div class="d-flex align-center justify-end">
              <!-- Public article -->
              <v-tooltip :text="t('article.viewArticle')">
                <template #activator="{ props: tooltipProps }">
                  <v-btn
                    v-bind="tooltipProps"
                    :href="localePath(`${publicBasePath}/${item.slug}`)"
                    :aria-label="`${t('article.viewArticle')}: ${item.titleFr || item.titleAr}`"
                    icon="mdi-open-in-new"
                    variant="text"
                    size="small"
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                </template>
              </v-tooltip>

              <!-- Edit / Delete -->
              <v-menu v-if="editable">
                <template #activator="{ props: menuProps }">
                  <v-btn
                    v-bind="menuProps"
                    icon="mdi-dots-vertical"
                    variant="text"
                    size="small"
                    :aria-label="t('common.actions')"
                  />
                </template>

                <v-list
                  density="compact"
                  min-width="180"
                  rounded="lg"
                >
                  <v-list-item
                    :to="{
                      path: localePath(`${editBasePath}/${item.slug}`),
                      query: route.query,
                    }"
                    prepend-icon="mdi-pencil-outline"
                    :title="t('common.edit')"
                  />

                  <v-divider class="my-1" />

                  <v-list-item
                    prepend-icon="mdi-delete-outline"
                    :title="t('common.delete')"
                    base-color="error"
                    @click="promptDelete(item.slug)"
                  />
                </v-list>
              </v-menu>
            </div>
          </template>

          <!-- Loading -->
          <template #loading>
            <div class="pa-4">
              <v-skeleton-loader
                v-for="index in 5"
                :key="index"
                type="list-item-avatar-two-line"
              />
            </div>
          </template>

          <!-- Empty state -->
          <template #no-data>
            <div class="empty-state">
              <v-avatar
                color="primary"
                variant="tonal"
                size="64"
                class="mb-4"
              >
                <v-icon
                  icon="mdi-file-document-search-outline"
                  size="30"
                />
              </v-avatar>

              <h3 class="text-h6 font-weight-bold mb-1">
                {{ t('common.noResults') }}
              </h3>

              <p class="text-body-2 text-medium-emphasis mb-5">
                <template v-if="hasActiveFilters">
                  No articles match the current filters.
                </template>

                <template v-else>
                  There are no articles to display yet.
                </template>
              </p>

              <v-btn
                v-if="hasActiveFilters"
                color="primary"
                variant="tonal"
                prepend-icon="mdi-filter-off-outline"
                @click="clearFilters"
              >
                {{ t('articles.clearFilters') }}
              </v-btn>

              <v-btn
                v-else-if="editable"
                :to="localePath(createTo)"
                color="primary"
                prepend-icon="mdi-plus"
              >
                {{ t('admin.newArticle') }}
              </v-btn>
            </div>
          </template>
        </v-data-table>

        <!-- Pagination -->
        <template v-if="pageCount > 1">
          <v-divider />

          <div class="pagination-bar d-flex align-center justify-space-between ga-4 px-4 py-3">
            <span class="text-caption text-medium-emphasis text-no-wrap">
              {{ resultStart }}–{{ resultEnd }} / {{ total }}
            </span>

            <v-pagination
              v-model="filters.page"
              :length="pageCount"
              :total-visible="5"
              density="compact"
              rounded="circle"
              aria-label="Article pagination"
              @update:model-value="onPageChange"
            />
          </div>
        </template>
      </v-card>
    </section>

    <!-- Delete confirmation -->
    <v-dialog
      v-if="editable"
      v-model="deleteDialog"
      max-width="460"
      persistent
    >
      <v-card
        rounded="xl"
        class="py-2"
      >
        <v-card-item class="pa-2">
          <template #prepend>
            <v-avatar
              color="error"
              variant="tonal"
              size="44"
            >
              <v-icon
                icon="mdi-delete-outline"
                size="24"
              />
            </v-avatar>
          </template>

          <v-card-title class="text-heading-small font-weight-bold">
            {{ t('admin.confirmDelete') }}
          </v-card-title>

          <v-card-subtitle>
            {{ t('admin.confirmDeleteText') }}
          </v-card-subtitle>
        </v-card-item>

        <v-card-text
          v-if="selectedArticle"
          class="pa-2"
        >
          <v-sheet
            rounded="xl"
            class="d-flex align-center ga-3 pa-2 bg-transparent border"
          >
            <v-img
              v-if="selectedArticle.coverImage"
              :src="selectedArticle.coverImage"
              :alt="selectedArticle.titleFr || selectedArticle.titleAr"
              width="56"
              height="42"
              cover
              rounded="lg"
              class="flex-grow-0"
            />

            <v-avatar
              v-else
              size="42"
              rounded="lg"
              color="surface"
            >
              <v-icon
                icon="mdi-file-document-outline"
                size="20"
              />
            </v-avatar>

            <div class="min-width-0">
              <div class="text-title-small  text-md-title-medium font-weight-medium">
                {{ selectedArticle.titleFr || selectedArticle.titleAr }}
              </div>

              <div
                v-if="selectedArticle.category"
                class="text-body-small  text-md-body-medium text-medium-emphasis mt-2"
              >
                {{
                  locale === 'fr'
                    ? selectedArticle.category.nameFr
                    : selectedArticle.category.nameAr
                }}
              </div>
            </div>
          </v-sheet>
        </v-card-text>

        <v-card-actions class="pa-2">
          <v-spacer />

          <v-btn
            variant="text"
            :disabled="deleting"
            rounded="xl"
            class="px-3"
            @click="closeDeleteDialog"
          >
            {{ t('common.cancel') }}
          </v-btn>

          <v-btn
            color="error"
            variant="flat"
            rounded="xl"
            class="px-3"
            prepend-icon="mdi-delete-outline"
            :loading="deleting"
            @click="onDeleteConfirm"
          >
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Feedback -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="4000"
      location="bottom end"
      rounded="lg"
    >
      <div class="d-flex align-center ga-3">
        <v-icon
          :icon="snackbar.color === 'success'
            ? 'mdi-check-circle-outline'
            : 'mdi-alert-circle-outline'"
        />

        <span>
          {{ snackbar.text }}
        </span>
      </div>

      <template #actions>
        <v-btn
          icon="mdi-close"
          variant="text"
          :aria-label="t('common.close')"
          @click="snackbar.show = false"
        />
      </template>
    </v-snackbar>
  </main>
</template>

<style scoped>
.articles-page {
  width: 100%;
  min-width: 0;
}

.articles-section {
  width: 100%;
  min-width: 0;
}

/*
 * Do not add overflow-x here.
 * Vuetify's data table already owns the table scroll container.
 */
.articles-table {
  width: 100%;
}

/*
 * Allow long titles to wrap instead of making the whole
 * table unnecessarily wide.
 */
.article-title {
  min-width: 9rem;
  max-width: 20rem;
  line-height: 1.45;
  white-space: normal;
  overflow-wrap: anywhere;
}

.home-position-select {
  min-width: 145px;
}

.empty-state {
  display: flex;
  min-height: 280px;
  padding: 48px 24px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.pagination-bar {
  min-height: 60px;
}

.min-width-0 {
  min-width: 0;
}

@media (max-width: 600px) {
  .pagination-bar {
    flex-direction: column;
    justify-content: center;
  }
}
</style>
