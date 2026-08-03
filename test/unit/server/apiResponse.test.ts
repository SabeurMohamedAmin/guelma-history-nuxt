import { describe, expect, it } from 'vitest'
import {
  createPaginationMeta,
  normalizePagination,
  paginated,
  success,
} from '~~/server/utils/apiResponse'

describe('API response helpers', () => {
  it('normalizes pagination defaults', () => {
    expect(normalizePagination()).toEqual({
      page: 1,
      pageSize: 20,
      offset: 0,
    })
  })

  it('caps page size and calculates the offset', () => {
    expect(normalizePagination({ page: 3, pageSize: 500 })).toEqual({
      page: 3,
      pageSize: 100,
      offset: 200,
    })
  })

  it('replaces invalid numeric values with defaults', () => {
    expect(normalizePagination({ page: 0, pageSize: Number.NaN })).toEqual({
      page: 1,
      pageSize: 20,
      offset: 0,
    })
  })

  it('creates pagination metadata for populated results', () => {
    expect(createPaginationMeta(2, 10, 25)).toEqual({
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    })
  })

  it('creates safe metadata for empty results', () => {
    expect(createPaginationMeta(1, 20, 0)).toEqual({
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
    })
  })

  it('wraps single and paginated responses consistently', () => {
    expect(success({ id: 'article-id' })).toEqual({ data: { id: 'article-id' } })
    expect(paginated(['one'], { page: 1, pageSize: 20 }, 1)).toEqual({
      data: ['one'],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    })
  })
})
