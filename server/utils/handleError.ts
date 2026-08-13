import { ZodError } from 'zod'

/**
 * Normalise any thrown value into an H3 error.
 *
 * - ZodError         → 400 with the first validation message
 * - createError()    → passed through as-is (already has statusCode)
 * - Anything else    → 500
 */
export function toH3Error(error: unknown): never {
  if (isZodError(error)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Validation Error',
      message: error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; '),
    })
  }

  // H3 errors already carry a statusCode
  if (error && typeof error === 'object' && 'statusCode' in error) {
    throw error
  }

  // Preserve useful diagnostics in server logs without exposing database,
  // provider, filesystem, or implementation details to production clients.
  console.error('[server] Unexpected request failure', error)

  throw createError({
    statusCode: 500,
    statusMessage: 'Internal Server Error',
    message: import.meta.dev && error instanceof Error
      ? error.message
      : 'An unexpected error occurred.',
  })
}

/**
 * Detect a ZodError by shape as well as instanceof. The shape check guards
 * against module-duplication edge cases where `instanceof` can be false.
 */
function isZodError(error: unknown): error is ZodError {
  return (
    error instanceof ZodError
    || (!!error && typeof error === 'object' && (error as { name?: string }).name === 'ZodError'
      && Array.isArray((error as { issues?: unknown }).issues))
  )
}
