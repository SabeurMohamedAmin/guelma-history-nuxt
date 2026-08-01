import { z } from 'zod'

/**
 * UUID stored by this application's database.
 *
 * Validate the canonical shape without requiring RFC version bits. New rows use
 * random UUIDs, while keys migrated from integers use deterministic UUIDs.
 */
export const DATABASE_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const databaseUuidSchema = z.string().regex(
  DATABASE_UUID_PATTERN,
  'Invalid UUID',
)

export function isDatabaseUuid(value: unknown): value is string {
  return typeof value === 'string' && DATABASE_UUID_PATTERN.test(value)
}

/** Trim and normalize an unknown form value into a database UUID or null. */
export function toDatabaseUuid(value: unknown): string | null {
  if (typeof value !== 'string') return null

  const id = value.trim()
  return isDatabaseUuid(id) ? id.toLowerCase() : null
}
