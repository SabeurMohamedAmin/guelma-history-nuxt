export const DEFAULT_ARTICLE_PAGE_SIZE = 24
export const MAX_ARTICLE_PAGE_SIZE = 100
export const MAX_ARTICLE_PAGE_NUMBER = 1_000_000

/** Parse a positive integer query value while keeping the result bounded. */
export function positiveInteger(value: unknown, fallback: number, maximum: number): number {
  const parsed = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN
  if (!Number.isSafeInteger(parsed) || parsed < 1) return fallback
  return Math.min(parsed, maximum)
}

/** Clamp a requested page to the real result set before calculating OFFSET. */
export function resolveArticlePagination(requestedPage: number, total: number, limit: number) {
  const totalPages = Math.ceil(total / limit)
  const page = Math.min(requestedPage, Math.max(1, totalPages))

  return {
    page,
    totalPages,
    offset: (page - 1) * limit,
  }
}
