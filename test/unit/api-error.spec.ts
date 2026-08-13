import { describe, expect, it } from 'vitest'
import {
  getApiErrorCode,
  getApiErrorMessage,
  getApiErrorStatus,
  getApiFieldErrors,
  getApiRequestId,
} from '~~/app/utils/apiError'

const FALLBACK = 'Something went wrong.'

describe('getApiErrorMessage', () => {
  it('reads the versioned /api/v1 error shape', () => {
    const error = { data: { error: { code: 'ARTICLE_NOT_FOUND', message: 'Article not found.' } } }

    expect(getApiErrorMessage(error, FALLBACK)).toBe('Article not found.')
  })

  it('reads the legacy Nuxt error shape', () => {
    const error = { data: { message: 'Invalid credentials.' } }

    expect(getApiErrorMessage(error, FALLBACK)).toBe('Invalid credentials.')
  })

  it('prefers the versioned message when a body carries both', () => {
    const error = { data: { message: 'legacy', error: { message: 'versioned' } } }

    expect(getApiErrorMessage(error, FALLBACK)).toBe('versioned')
  })

  it('falls back when there is no response body', () => {
    // A network failure never reaches the server, so it has no parsed body.
    expect(getApiErrorMessage(new Error('Failed to fetch'), FALLBACK)).toBe(FALLBACK)
    expect(getApiErrorMessage(null, FALLBACK)).toBe(FALLBACK)
    expect(getApiErrorMessage('boom', FALLBACK)).toBe(FALLBACK)
    expect(getApiErrorMessage({ data: {} }, FALLBACK)).toBe(FALLBACK)
  })

  it('treats a blank message as missing so no empty alert renders', () => {
    expect(getApiErrorMessage({ data: { message: '   ' } }, FALLBACK)).toBe(FALLBACK)
    expect(getApiErrorMessage({ data: { error: { message: '' } } }, FALLBACK)).toBe(FALLBACK)
  })

  it('never shows statusMessage, which is an HTTP label and not user copy', () => {
    expect(getApiErrorMessage({ data: { statusMessage: 'Bad Request' } }, FALLBACK)).toBe(FALLBACK)
  })

  it('never shows the ofetch developer string', () => {
    // What a reader used to see on a rate-limited submission.
    const error = {
      statusCode: 429,
      message: '[POST] "/api/articles/comments": 429 Too Many Requests',
      data: { statusMessage: 'Too Many Requests' },
    }

    expect(getApiErrorMessage(error, FALLBACK)).toBe(FALLBACK)
  })
})

describe('getApiErrorCode', () => {
  it('returns the versioned code and null for legacy bodies', () => {
    expect(getApiErrorCode({ data: { error: { code: 'ARTICLE_CONFLICT' } } })).toBe('ARTICLE_CONFLICT')
    expect(getApiErrorCode({ data: { message: 'legacy' } })).toBeNull()
    expect(getApiErrorCode(null)).toBeNull()
  })
})

describe('getApiFieldErrors', () => {
  it('returns the field map when present', () => {
    const error = { data: { error: { fields: { titleAr: ['Required'] } } } }

    expect(getApiFieldErrors(error)).toEqual({ titleAr: ['Required'] })
  })

  it('always returns an object so callers can index it safely', () => {
    expect(getApiFieldErrors({ data: { error: { fields: null } } })).toEqual({})
    expect(getApiFieldErrors(null)).toEqual({})
  })
})

describe('getApiRequestId', () => {
  it('returns the correlation id when the server sent one', () => {
    expect(getApiRequestId({ data: { error: { requestId: 'req_123' } } })).toBe('req_123')
    expect(getApiRequestId({ data: { message: 'legacy' } })).toBeNull()
  })
})

describe('getApiErrorStatus', () => {
  it('reads statusCode from a fetch or H3 error', () => {
    expect(getApiErrorStatus({ statusCode: 429 })).toBe(429)
    expect(getApiErrorStatus({ statusCode: 409, data: { message: 'stale' } })).toBe(409)
  })

  it('falls back to status for a Response-like object', () => {
    expect(getApiErrorStatus({ status: 503 })).toBe(503)
  })

  it('returns null when the request never reached the server', () => {
    expect(getApiErrorStatus(new Error('Failed to fetch'))).toBeNull()
    expect(getApiErrorStatus(null)).toBeNull()
    expect(getApiErrorStatus('boom')).toBeNull()
  })
})
