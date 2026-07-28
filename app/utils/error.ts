/**
 * Extract a human-readable message from an H3/$fetch error, falling back to a
 * provided default. Keeps error-handling consistent across the admin UI.
 */
export function extractErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  return fallback
}
