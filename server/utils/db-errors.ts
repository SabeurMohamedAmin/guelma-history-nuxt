/**
 * Small helpers for interpreting low-level database errors.
 *
 * Check-then-write flows (e.g. "is this email taken?" before an INSERT or
 * UPDATE) always leave a tiny race window between the check and the write.
 * The unique indexes are the real guarantee: the losing request receives a
 * unique-constraint violation from the database. Callers use this helper to
 * translate that violation into the same friendly conflict error their
 * up-front check produces, instead of an opaque 500.
 */

/** True when an error is a unique-constraint violation (SQLSTATE 23505). */
export function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: unknown }).code === '23505'
}
