import type { ArticleListItem } from '~~/shared/types/article'
import {
  DATE_RANGE_PRESETS,
  DEFAULT_DATE_RANGE,
  DEFAULT_DISPLAY_MODE,
  DEFAULT_SORT,
  type DisplayMode,
} from '~~/app/constants/articleSort'

interface ArticlesResponse {
  articles: ArticleListItem[]
  total: number
}

/**
 * Owns all state for the public /articles page: the free-text query, the
 * category filter, the active sort, the date range, the display mode
 * (grid / rows) and the fetched data.
 *
 * The current filters are mirrored in the URL so a filtered view can be shared
 * or deep-linked, and the data refetches automatically whenever any filter
 * changes. Keeping this here lets the page component stay declarative.
 */
export function useArticles() {
  const route = useRoute()
  const router = useRouter()

  // Seed state from the URL so shared/deep links restore the same view.
  const search = ref<string>(typeof route.query.q === 'string' ? route.query.q : '')
  const category = ref<string | null>(
    typeof route.query.category === 'string' ? route.query.category : null,
  )
  const sort = ref<string>(
    typeof route.query.sort === 'string' ? route.query.sort : DEFAULT_SORT,
  )
  const range = ref<string>(
    typeof route.query.range === 'string' ? route.query.range : DEFAULT_DATE_RANGE,
  )
  const displayMode = ref<DisplayMode>(DEFAULT_DISPLAY_MODE)

  // Minimum characters (trimmed) before a search term is sent to the API.
  const MIN_SEARCH_LENGTH = 2
  // How long to wait after the last keystroke before searching.
  const SEARCH_DEBOUNCE_MS = 200

  // Debounced copy of `search`. The input stays bound to `search` for instant
  // typing feedback, while `debouncedSearch` drives the actual fetch and URL,
  // so we don't fire a request on every keystroke.
  const debouncedSearch = ref<string>(search.value)
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  watch(search, (value) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debouncedSearch.value = value
    }, SEARCH_DEBOUNCE_MS)
  })

  onBeforeUnmount(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
  })

  // Translate the selected range preset into a `from` ISO date (or undefined).
  const fromDate = computed<string | undefined>(() => {
    const preset = DATE_RANGE_PRESETS.find(p => p.value === range.value)
    if (!preset || preset.months === null) return undefined
    const date = new Date()
    date.setMonth(date.getMonth() - preset.months)
    return date.toISOString()
  })

  // Effective query sent to the API: debounced, trimmed, and only applied once
  // it reaches the minimum length. Shorter terms are treated as empty (omitted)
  // so the full list is shown.
  const trimmedQuery = computed<string | undefined>(() => {
    const value = debouncedSearch.value.trim()
    return value.length >= MIN_SEARCH_LENGTH ? value : undefined
  })

  const { data, pending, error, refresh } = useFetch<ArticlesResponse>(
    '/api/articles/list',
    {
      query: {
        q: trimmedQuery,
        category,
        sort,
        from: fromDate,
      },
      watch: [trimmedQuery, category, sort, fromDate],
      default: () => ({ articles: [], total: 0 }),
    },
  )

  const articles = computed<ArticleListItem[]>(() => data.value?.articles ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const isEmpty = computed(() => !pending.value && articles.value.length === 0)

  // True when any filter narrows the default "all articles" view. Uses the raw
  // `search` (not the debounced term) so the clear button reflects what the
  // user typed immediately, even before the debounce fires.
  const hasActiveFilters = computed(() =>
    search.value.trim().length > 0
    || Boolean(category.value)
    || sort.value !== DEFAULT_SORT
    || range.value !== DEFAULT_DATE_RANGE,
  )

  function buildFilterQuery() {
    const queryEntries: Record<string, string> = {}

    if (trimmedQuery.value) queryEntries.q = trimmedQuery.value
    if (category.value) queryEntries.category = category.value
    if (sort.value !== DEFAULT_SORT) queryEntries.sort = sort.value
    if (range.value !== DEFAULT_DATE_RANGE) queryEntries.range = range.value

    return queryEntries
  }

  function syncFiltersToUrl() {
    return router.replace({ query: buildFilterQuery() })
  }

  /** Reset every filter back to its default (does not touch the display mode). */
  async function resetFilters() {
    // Flush any pending debounce and clear the debounced term synchronously so
    // the fetch, URL and active-filter state all reset at once (no 200ms lag).
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }

    search.value = ''
    debouncedSearch.value = ''
    category.value = null
    sort.value = DEFAULT_SORT
    range.value = DEFAULT_DATE_RANGE

    await syncFiltersToUrl()
  }

  // Keep the URL in sync with the active filters (omit defaults for clean links).
  watch([trimmedQuery, category, sort, range], () => {
    void syncFiltersToUrl()
  })

  return {
    // state
    search,
    category,
    sort,
    range,
    displayMode,
    // data
    articles,
    total,
    pending,
    error,
    isEmpty,
    hasActiveFilters,
    // actions
    resetFilters,
    refresh,
  }
}
