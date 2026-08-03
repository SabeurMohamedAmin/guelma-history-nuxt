import { ZodError } from 'zod'
import type {
  ApiErrorBody,
  ApiFieldError,
} from '~~/server/types/api.types'

export const API_ERROR_CODES = {
  authenticationRequired: 'AUTHENTICATION_REQUIRED',
  invalidCredentials: 'INVALID_CREDENTIALS',
  sessionExpired: 'SESSION_EXPIRED',
  permissionDenied: 'PERMISSION_DENIED',
  validationFailed: 'VALIDATION_FAILED',
  resourceNotFound: 'RESOURCE_NOT_FOUND',
  conflict: 'CONFLICT',
  rateLimitExceeded: 'RATE_LIMIT_EXCEEDED',
  payloadTooLarge: 'PAYLOAD_TOO_LARGE',
  unsupportedMediaType: 'UNSUPPORTED_MEDIA_TYPE',
  internalError: 'INTERNAL_ERROR',
} as const

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES]

export interface ApiErrorDescriptor {
  statusCode: number
  code: ApiErrorCode
  message: string
  fields: ApiFieldError[] | null
}

interface H3LikeError {
  statusCode?: unknown
  message?: unknown
}

/**
 * Convert an unknown failure to a stable, client-safe API error descriptor.
 * Domain-specific handlers may override the generic status-based code later.
 */
export function describeApiError(error: unknown): ApiErrorDescriptor {
  if (isZodError(error)) {
    return {
      statusCode: 400,
      code: API_ERROR_CODES.validationFailed,
      message: 'The request contains invalid fields.',
      fields: error.issues.map(issue => ({
        field: issue.path.length > 0 ? issue.path.join('.') : 'request',
        message: issue.message,
      })),
    }
  }

  const h3Error = asH3LikeError(error)
  const statusCode = normalizeStatusCode(h3Error?.statusCode)

  switch (statusCode) {
    case 400:
      return descriptor(400, API_ERROR_CODES.validationFailed, safeClientMessage(h3Error, 'Invalid request.'))
    case 401:
      return descriptor(401, API_ERROR_CODES.authenticationRequired, safeClientMessage(h3Error, 'Authentication required.'))
    case 403:
      return descriptor(403, API_ERROR_CODES.permissionDenied, safeClientMessage(h3Error, 'You do not have permission to perform this action.'))
    case 404:
      return descriptor(404, API_ERROR_CODES.resourceNotFound, safeClientMessage(h3Error, 'Resource not found.'))
    case 409:
      return descriptor(409, API_ERROR_CODES.conflict, safeClientMessage(h3Error, 'The request conflicts with the current resource state.'))
    case 413:
      return descriptor(413, API_ERROR_CODES.payloadTooLarge, 'The request payload is too large.')
    case 415:
      return descriptor(415, API_ERROR_CODES.unsupportedMediaType, 'The media type is not supported.')
    case 429:
      return descriptor(429, API_ERROR_CODES.rateLimitExceeded, 'Too many requests. Please try again later.')
    default:
      return descriptor(500, API_ERROR_CODES.internalError, 'An unexpected server error occurred.')
  }
}

export function createApiErrorBody(
  descriptor: ApiErrorDescriptor,
  requestId: string,
): ApiErrorBody {
  return {
    error: {
      code: descriptor.code,
      message: descriptor.message,
      fields: descriptor.fields,
      requestId,
    },
  }
}

export function createRequestId(headerValue?: string | null): string {
  const candidate = headerValue?.trim()

  // Accept a conservative caller-provided identifier for request correlation.
  // Reject long or unusual values so they cannot pollute logs or responses.
  if (candidate && /^[A-Za-z0-9._-]{1,100}$/.test(candidate)) {
    return candidate
  }

  return crypto.randomUUID()
}

function descriptor(
  statusCode: number,
  code: ApiErrorCode,
  message: string,
): ApiErrorDescriptor {
  return { statusCode, code, message, fields: null }
}

function asH3LikeError(error: unknown): H3LikeError | null {
  return error && typeof error === 'object' ? error as H3LikeError : null
}

function normalizeStatusCode(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) ? value : 500
}

function safeClientMessage(error: H3LikeError | null, fallback: string): string {
  return typeof error?.message === 'string' && error.message.trim()
    ? error.message
    : fallback
}

function isZodError(error: unknown): error is ZodError {
  return (
    error instanceof ZodError
    || (!!error && typeof error === 'object'
      && (error as { name?: string }).name === 'ZodError'
      && Array.isArray((error as { issues?: unknown }).issues))
  )
}
