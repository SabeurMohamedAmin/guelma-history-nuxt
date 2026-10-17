import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ARTICLE_PAGE_SIZE,
  MAX_ARTICLE_PAGE_NUMBER,
  MAX_ARTICLE_PAGE_SIZE,
  positiveInteger,
  resolveArticlePagination,
} from '~~/server/utils/articlePagination'

describe('article list pagination', () => {
  it('uses a page size of 24 by default and caps requests at 100', () => {
    expect(positiveInteger(undefined, DEFAULT_ARTICLE_PAGE_SIZE, MAX_ARTICLE_PAGE_SIZE)).toBe(24)
    expect(positiveInteger('1000', DEFAULT_ARTICLE_PAGE_SIZE, MAX_ARTICLE_PAGE_SIZE)).toBe(100)
  })

  it.each(['0', '-2', '1.5', 'not-a-number', '', Number.NaN, Number.POSITIVE_INFINITY])(
    'uses the fallback for invalid positive-integer input: %s',
    (value) => {
      expect(positiveInteger(value, 1, MAX_ARTICLE_PAGE_NUMBER)).toBe(1)
    },
  )

  it('clamps a requested page to the final page before calculating the offset', () => {
    expect(resolveArticlePagination(999_999, 241, 24)).toEqual({
      page: 11,
      totalPages: 11,
      offset: 240,
    })
  })

  it('keeps an empty result set on page one with a zero page count', () => {
    expect(resolveArticlePagination(7, 0, 24)).toEqual({
      page: 1,
      totalPages: 0,
      offset: 0,
    })
  })
})
