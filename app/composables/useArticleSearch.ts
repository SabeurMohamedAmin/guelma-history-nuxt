import type { SearchParams, SearchResponse } from '~~/shared/types/search'

type SearchInput = Partial<Pick<SearchParams, 'q' | 'category' | 'dateFrom' | 'dateTo' | 'page'>>

/** Page size, kept in step with the API default so URLs stay clean. */
const DEFAULT_LIMIT = 12

/**
 * Drives the search results page.
 *
 * The fetch is triggered explicitly (via `search()`) and on first load from
 * the URL. We keep the URL in sync for shareable links, but the data fetch
 * does NOT depend on the route→computed reactivity chain — that proved
 * unreliable for in-page resubmits. This makes every submit deterministic.
 */
export function useArticleSearch() {
  const route = useRoute()
  const router = useRouter()

  // Read the initial state from the URL (supports shared/deep links).
  function paramsFromRoute(): SearchParams {
    return {
      q: String(route.query.q ?? ''),
      category: route.query.category ? String(route.query.category) : null,
      dateFrom: route.query.dateFrom ? String(route.query.dateFrom) : null,
      dateTo: route.query.dateTo ? String(route.query.dateTo) : null,
      page: Number(route.query.page) || 1,
      limit: Number(route.query.limit) || DEFAULT_LIMIT,
    }
  }

  const params = ref<SearchParams>(paramsFromRoute())

  const { data, pending, error, execute } = useAsyncData<SearchResponse>(
    'article-search',
    // The request generic is pinned to `string`. Left to infer, $fetch compares
    // the path against every generated route and TypeScript gives up with
    // "excessive stack depth" (TS2321).
    () => $fetch<SearchResponse, string>('/api/search', { query: { ...params.value } }),
    { immediate: true },
  )

  const articles = computed(() => data.value?.articles ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const query = computed(() => params.value.q)
  const hasQuery = computed(() => {
    const p = params.value
    return p.q.trim().length > 0 || !!p.category || !!p.dateFrom || !!p.dateTo
  })
  const isEmpty = computed(() => hasQuery.value && !pending.value && articles.value.length === 0)

  /** Reflect the current params in the URL (clean: omit empty values). */
  function syncUrl() {
    // Drop empty values, the first page, and the default page size.
    const entries = Object.entries(params.value).filter(
      ([key, value]) =>
        value !== null && value !== '' && value !== 1
        && !(key === 'limit' && value === DEFAULT_LIMIT),
    )
    router.replace({ query: Object.fromEntries(entries) })
  }

  /** Apply new search input, update the URL, and fetch fresh results. */
  async function search(input: SearchInput = {}) {
    params.value = {
      ...params.value,
      ...input,
      page: input.page ?? 1,
    }
    syncUrl()
    await execute()
  }

  /** Current page, and how many pages the total number of results spans. */
  const page = computed(() => params.value.page)
  const pageCount = computed(() =>
    Math.max(1, Math.ceil(total.value / params.value.limit)),
  )

  /** Jump to a results page, keeping every other filter untouched. */
  async function goToPage(next: number) {
    await search({ page: next })
  }

  return {
    params,
    query,
    articles,
    total,
    page,
    pageCount,
    pending,
    error,
    hasQuery,
    isEmpty,
    search,
    goToPage,
    refresh: execute,
  }
}
