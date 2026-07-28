import type { H3Event } from 'h3'
import type { SearchParams } from '~~/shared/types/search'

const DEFAULT_LIMIT = 12
const MAX_LIMIT = 50

function toPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Accept only well-formed `YYYY-MM-DD` calendar dates; anything else → null.
 * Guards the service from invalid input reaching the query.
 */
function toIsoDate(value: unknown): string | null {
  const raw = toTrimmedString(value)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null

  const timestamp = Date.parse(raw)
  return Number.isNaN(timestamp) ? null : raw
}

/**
 * Parse and normalize the raw query string into validated SearchParams.
 * Centralizes validation so the endpoint and service receive clean input.
 */
export function parseSearchParams(event: H3Event): SearchParams {
  const query = getQuery(event)

  const category = toTrimmedString(query.category)
  const limit = Math.min(toPositiveInt(query.limit, DEFAULT_LIMIT), MAX_LIMIT)

  return {
    q: toTrimmedString(query.q),
    category: category || null,
    dateFrom: toIsoDate(query.dateFrom),
    dateTo: toIsoDate(query.dateTo),
    page: toPositiveInt(query.page, 1),
    limit,
  }
}
