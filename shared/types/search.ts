import type { ArticleListItem } from './article'

/**
 * Normalized search input used by the API and the search service.
 * `q` matches article title (ar/fr) and body; `category` filters by slug;
 * `dateFrom`/`dateTo` bound the publish date (inclusive, ISO `YYYY-MM-DD`).
 */
export interface SearchParams {
  q: string
  category: string | null
  dateFrom: string | null
  dateTo: string | null
  page: number
  limit: number
}

/**
 * Search response envelope. Includes the echoed query so the client
 * can render state without re-deriving it from the URL.
 */
export interface SearchResponse {
  articles: ArticleListItem[]
  total: number
  query: string
  category: string | null
  dateFrom: string | null
  dateTo: string | null
  page: number
  limit: number
}
