import { z } from 'zod'

/**
 * Zod schemas for the public author-profile endpoints.
 *
 * - `authorSlugSchema` guards the `[slug]` route param.
 * - `paginationSchema` parses `page`/`limit` for the article list; values arrive
 *   as query strings so we coerce, clamp the limit, and apply safe defaults.
 */

export const authorSlugSchema = z
  .string()
  .trim()
  .min(1, 'Author slug is required')
  .max(255)

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
})

export type PaginationInput = z.infer<typeof paginationSchema>

export function validateAuthorSlug(slug: unknown) {
  return authorSlugSchema.parse(slug)
}

export function validatePagination(query: unknown) {
  return paginationSchema.parse(query)
}
