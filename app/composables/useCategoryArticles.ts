import type { ArticleListItem } from '~~/shared/types/article'
import type { CategoryMeta } from '~~/shared/types/category'
import {
  DATE_RANGE_PRESETS,
  DEFAULT_DATE_RANGE,
  DEFAULT_DISPLAY_MODE,
  DEFAULT_SORT,
  type DisplayMode,
} from '~~/app/constants/articleSort'

interface CategoryArticlesResponse {
  category: CategoryMeta
  articles: ArticleListItem[]
  total: number
}

/**
 * Owns all state for the category page: the active sort, the date range, the
 * display mode (grid / rows) and the fetched data. Refetches whenever the sort
 * or range changes.
 *
 * Keeping this here keeps the page component declarative and easy to test.
 */
export async function useCategoryArticles(slug: MaybeRefOrGetter<string>) {
  const sort = ref<string>(DEFAULT_SORT)
  const range = ref<string>(DEFAULT_DATE_RANGE)
  const displayMode = ref<DisplayMode>(DEFAULT_DISPLAY_MODE)

  // Translate the selected range preset into a `from` ISO date (or undefined).
  const fromDate = computed<string | undefined>(() => {
    const preset = DATE_RANGE_PRESETS.find(p => p.value === range.value)
    if (!preset || preset.months === null) return undefined
    const date = new Date()
    date.setMonth(date.getMonth() - preset.months)
    return date.toISOString()
  })

  // Awaited so the server finishes the request before rendering. The page needs
  // the resolved value to answer 404 with a real 404 status code.
  const { data, pending, error, refresh } = await useFetch<CategoryArticlesResponse>(
    () => `/api/categories/${toValue(slug)}/articles`,
    {
      query: { sort, from: fromDate },
      watch: [sort, fromDate],
      default: () => ({
        category: null as unknown as CategoryMeta,
        articles: [],
        total: 0,
      }),
    },
  )

  const category = computed(() => data.value?.category ?? null)
  const articles = computed<ArticleListItem[]>(() => data.value?.articles ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const isEmpty = computed(() => !pending.value && articles.value.length === 0)

  function setSort(value: string) {
    sort.value = value
  }

  function setRange(value: string) {
    range.value = value
  }

  function setDisplayMode(mode: DisplayMode) {
    displayMode.value = mode
  }

  return {
    // state
    sort,
    range,
    displayMode,
    // data
    category,
    articles,
    total,
    pending,
    error,
    isEmpty,
    // actions
    setSort,
    setRange,
    setDisplayMode,
    refresh,
  }
}
