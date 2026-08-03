import type { H3Event } from 'h3'
import { getHeader, setHeader, setResponseStatus } from 'h3'
import {
  createApiErrorBody,
  createRequestId,
  describeApiError,
} from '~~/server/utils/apiError'

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
    setHeader(event, 'cache-control', 'private, no-store')
    setHeader(event, 'content-type', 'application/json; charset=utf-8')

    try {
      return await handler(event, { requestId })
    }
    catch (error) {
      const descriptor = describeApiError(error)
      setResponseStatus(event, descriptor.statusCode)

      return createApiErrorBody(descriptor, requestId)
    }
  })
}
