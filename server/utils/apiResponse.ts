import type {
  ApiPaginatedSuccess,
  ApiPaginationMeta,
  ApiSuccess,
} from '~~/server/types/api.types'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100

export interface PaginationInput {
  page?: number
  pageSize?: number
}

export interface NormalizedPagination {
  page: number
  pageSize: number
  offset: number
}

/** Normalize trusted numeric pagination input before passing it to a repository. */
export function normalizePagination(input: PaginationInput = {}): NormalizedPagination {
  const page = normalizePositiveInteger(input.page, DEFAULT_PAGE)
  const requestedPageSize = normalizePositiveInteger(input.pageSize, DEFAULT_PAGE_SIZE)
  const pageSize = Math.min(requestedPageSize, MAX_PAGE_SIZE)

  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  }
}

export function createPaginationMeta(
  page: number,
  pageSize: number,
  total: number,
): ApiPaginationMeta {
  const safeTotal = Math.max(0, Math.trunc(total))
  const totalPages = safeTotal === 0 ? 0 : Math.ceil(safeTotal / pageSize)

  return {
    page,
    pageSize,
    total: safeTotal,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
  }
}

export function success<T>(data: T): ApiSuccess<T> {
  return { data }
}

export function paginated<T>(
  data: T[],
  pagination: Pick<NormalizedPagination, 'page' | 'pageSize'>,
  total: number,
): ApiPaginatedSuccess<T> {
  return {
    data,
    meta: createPaginationMeta(pagination.page, pagination.pageSize, total),
  }
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isInteger(value) || (value ?? 0) < 1) return fallback
  return value as number
}
