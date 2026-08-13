/**
 * One place that turns a failed API call into something we can show a user.
 *
 * The backend answers with TWO shapes, and a page should not have to know which
 * endpoint it called:
 *
 * - versioned `/api/v1` routes:
 *     { error: { code, message, fields, requestId } }
 * - legacy Nuxt routes:
 *     { statusCode, statusMessage, message }
 *
 * `statusMessage` is never used as copy: it holds an HTTP label such as
 * "Bad Request", not something a reader should see.
 */

/** Structured error body from the versioned API. */
interface VersionedErrorBody {
  error?: {
    code?: string
    message?: string
    fields?: Record<string, string[]> | null
    requestId?: string | null
  }
}

/** Legacy Nuxt/H3 error body. */
interface LegacyErrorBody {
  message?: string
}

type ApiErrorBody = VersionedErrorBody & LegacyErrorBody

/**
 * Pull the parsed response body out of a fetch error.
 *
 * `$fetch` puts it on `error.data`. Anything else — a network failure, a thrown
 * string, null — has no body, so callers fall back to their own message.
 */
function getErrorBody(error: unknown): ApiErrorBody | null {
  if (!error || typeof error !== 'object' || !('data' in error)) return null

  const data = (error as { data?: unknown }).data
  if (!data || typeof data !== 'object') return null

  return data as ApiErrorBody
}

/** Treat a blank message as missing, so we never render an empty alert. */
function cleanMessage(message: string | undefined): string {
  return typeof message === 'string' ? message.trim() : ''
}

/**
 * The message to display, preferring the versioned API's message, then the
 * legacy one, then the caller's fallback.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const body = getErrorBody(error)

  return cleanMessage(body?.error?.message)
    || cleanMessage(body?.message)
    || fallback
}

/**
 * The stable machine-readable code from the versioned API (for example
 * `ARTICLE_NOT_FOUND`), or null for legacy routes. Branch on this rather than
 * on message text, which is translated and may change.
 */
export function getApiErrorCode(error: unknown): string | null {
  return getErrorBody(error)?.error?.code ?? null
}

/**
 * Per-field validation errors, ready to bind to a Vuetify field's
 * `:error-messages`. Always an object, so callers can index it safely.
 */
export function getApiFieldErrors(error: unknown): Record<string, string[]> {
  return getErrorBody(error)?.error?.fields ?? {}
}

/**
 * The safe correlation id the versioned API attaches to unexpected failures.
 * Showing it lets a user quote it in a bug report, and it matches the id in the
 * server log without exposing anything sensitive.
 */
export function getApiRequestId(error: unknown): string | null {
  return getErrorBody(error)?.error?.requestId ?? null
}

/**
 * The HTTP status of a failed call, or null when the request never reached the
 * server (a network failure has no status).
 *
 * Useful for the responses that carry no readable body of their own — a 429
 * from the route rate limiter, for instance — where the page should supply its
 * own localized wording instead of an English HTTP label.
 *
 * `statusCode` is what ofetch's FetchError and H3 errors expose; `status` is
 * checked as a fallback for a raw Response-like object.
 */
export function getApiErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null

  const candidate = error as { statusCode?: unknown, status?: unknown }
  const status = typeof candidate.statusCode === 'number'
    ? candidate.statusCode
    : candidate.status

  return typeof status === 'number' ? status : null
}
