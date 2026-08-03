import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  API_ERROR_CODES,
  createApiErrorBody,
  createRequestId,
  describeApiError,
} from '~~/server/utils/apiError'

describe('API error mapping', () => {
  it('maps Zod issues to structured field errors', () => {
    const schema = z.object({
      titleAr: z.string().min(1, 'Arabic title is required'),
      media: z.array(z.object({ url: z.string().url('Invalid media URL') })),
    })

    const result = schema.safeParse({ titleAr: '', media: [{ url: 'invalid' }] })
    expect(result.success).toBe(false)
    if (result.success) return

    expect(describeApiError(result.error)).toEqual({
      statusCode: 400,
      code: API_ERROR_CODES.validationFailed,
      message: 'The request contains invalid fields.',
      fields: [
        { field: 'titleAr', message: 'Arabic title is required' },
        { field: 'media.0.url', message: 'Invalid media URL' },
      ],
    })
  })

  it('maps common HTTP status codes', () => {
    expect(describeApiError({ statusCode: 404, message: 'Article not found.' })).toEqual({
      statusCode: 404,
      code: API_ERROR_CODES.resourceNotFound,
      message: 'Article not found.',
      fields: null,
    })
  })

  it('does not expose unknown internal error messages', () => {
    expect(describeApiError(new Error('database connection details'))).toEqual({
      statusCode: 500,
      code: API_ERROR_CODES.internalError,
      message: 'An unexpected server error occurred.',
      fields: null,
    })
  })

  it('creates the public error envelope', () => {
    const descriptor = describeApiError({ statusCode: 403 })

    expect(createApiErrorBody(descriptor, 'request-123')).toEqual({
      error: {
        code: API_ERROR_CODES.permissionDenied,
        message: 'You do not have permission to perform this action.',
        fields: null,
        requestId: 'request-123',
      },
    })
  })

  it('accepts safe request IDs and replaces unsafe values', () => {
    expect(createRequestId('mobile-request_123')).toBe('mobile-request_123')

    const generated = createRequestId('unsafe request\nvalue')
    expect(generated).toMatch(/^[0-9a-f-]{36}$/)
  })
})
