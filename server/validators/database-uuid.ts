import { z } from 'zod'

/**
 * UUID stored by the database.
 *
 * This intentionally validates the UUID shape instead of requiring a specific
 * RFC version. New rows use random UUIDs, while migrated integer keys use a
 * deterministic UUID mapping and may not contain standard version bits.
 */
export const databaseUuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  'Invalid UUID',
)

export function isDatabaseUuid(value: unknown): value is string {
  return databaseUuidSchema.safeParse(value).success
}
