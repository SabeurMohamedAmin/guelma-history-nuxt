import { z } from 'zod'

/**
 * An article slug — the public, human-readable identifier used in URLs
 * (e.g. "massacres-8-mai-1945-guelma").
 *
 * Slugs are the preferred article reference at every API boundary: they are
 * stable, readable, and avoid the int64 precision pitfalls of raw database ids
 * (CockroachDB ids exceed Number.MAX_SAFE_INTEGER). The server resolves
 * slug -> internal id, so the numeric id never has to leave the database layer.
 */
export const articleSlugSchema = z
  .string()
  .trim()
  .min(1, 'Article slug is required')
  .max(220, 'Article slug is too long')
  .regex(/^[\w-]+$/, 'Invalid article slug')
