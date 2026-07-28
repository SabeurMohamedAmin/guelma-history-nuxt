/**
 * Sort options for article listings.
 *
 * Single source of truth shared by the UI (toolbar) and consumed by the API
 * via the `value` sent as the `sort` query param. Add a new option here and
 * map it in the API's SORT_COLUMNS to enable a new sort end to end.
 *
 * `labelKey` / `icon` drive the toolbar; `value` is the API contract.
 */
export interface ArticleSortOption {
  value: string
  labelKey: string
  icon: string
}

export const ARTICLE_SORT_OPTIONS: ArticleSortOption[] = [
  { value: 'recent', labelKey: 'sort.recent', icon: 'mdi-calendar-clock' },
  { value: 'title', labelKey: 'sort.title', icon: 'mdi-sort-alphabetical-ascending' },
  { value: 'popular', labelKey: 'sort.popular', icon: 'mdi-eye-outline' },
  { value: 'hot', labelKey: 'sort.hot', icon: 'mdi-fire' },
  { value: 'commented', labelKey: 'sort.commented', icon: 'mdi-comment-outline' },
]

export const DEFAULT_SORT = 'recent'

export type DisplayMode = 'grid' | 'rows'
export const DEFAULT_DISPLAY_MODE: DisplayMode = 'grid'

/**
 * Date-range presets for the listing toolbar timer/filter.
 * `months` of null means "all time" (no lower bound).
 */
export interface DateRangePreset {
  value: string
  labelKey: string
  months: number | null
}

export const DATE_RANGE_PRESETS: DateRangePreset[] = [
  { value: 'all', labelKey: 'range.all', months: null },
  { value: 'month', labelKey: 'range.month', months: 1 },
  { value: 'quarter', labelKey: 'range.quarter', months: 3 },
  { value: 'year', labelKey: 'range.year', months: 12 },
]

export const DEFAULT_DATE_RANGE = 'all'
