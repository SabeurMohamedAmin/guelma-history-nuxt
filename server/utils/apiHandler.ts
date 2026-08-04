import type { H3Event } from 'h3'
import { getHeader, setHeader, setResponseStatus } from 'h3'
import {
  createApiErrorBody,
  createRequestId,
  describeApiError,
} from '~~/server/utils/apiError'
import { API_COMPATIBILITY_POLICY } from '~~/server/constants/api'

export interface ApiRequestContext {
  requestId: string
}

type VersionedApiHandler<T> = (
  event: H3Event,
  context: ApiRequestContext,
) => Promise<T> | T

/** Common transport behavior for new versioned JSON API routes. */
export function defineVersionedApiHandler<T>(handler: VersionedApiHandler<T>) {
  return defineEventHandler(async (event) => {
    const requestId = createRequestId(getHeader(event, 'x-request-id'))

    setHeader(event, 'x-request-id', requestId)
    setHeader(event, 'x-api-version', API_COMPATIBILITY_POLICY.version)
    setHeader(event, 'cache-control', 'private, no-store')
    setHeader(event, 'content-type', 'application/json; charset=utf-8')

    if (API_COMPATIBILITY_POLICY.deprecated) {
      setHeader(event, 'deprecation', 'true')
      if (API_COMPATIBILITY_POLICY.sunsetAt) {
        setHeader(event, 'sunset', API_COMPATIBILITY_POLICY.sunsetAt)
      }
    }

    try {
      return await handler(event, { requestId })
    }
    catch (error) {
      const descriptor = describeApiError(error)
      setResponseStatus(event, descriptor.statusCode)

      // Log only server failures. Expected client errors are represented by the
      // stable response contract and do not need noisy logs. Never serialize
      // the request body, headers, bearer token, password, or refresh token.
      if (descriptor.statusCode >= 500) {
        const errorDetails =
          typeof error === 'object' && error !== null
            ? error as Record<string, unknown>
            : null

        console.error('[api] Unexpected versioned API failure', {
          requestId,
          method: event.method,
          path: event.path,
          errorName: error instanceof Error ? error.name : 'UnknownError',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorCode: errorDetails?.code
            ? String(errorDetails.code)
            : undefined,
          errorConstraint: errorDetails?.constraint
            ? String(errorDetails.constraint)
            : undefined,
        })
      }

      return createApiErrorBody(descriptor, requestId)
    }
  })
}
