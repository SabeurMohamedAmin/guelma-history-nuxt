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

export const createAdminAuthorSchema = z.object({
  nameAr: z.string().trim().min(1, 'Arabic name is required'),
  nameFr: z.string().trim().min(1, 'French name is required'),
  bioAr: z.string().trim().nullable().optional(),
  bioFr: z.string().trim().nullable().optional(),
  avatar: z.string().trim().nullable().optional(),
})

export const updateAdminAuthorSchema = createAdminAuthorSchema.partial().refine(
  value => Object.keys(value).length > 0,
  { message: 'No fields to update' },
)

export type CreateAdminAuthorInput = z.infer<typeof createAdminAuthorSchema>
export type UpdateAdminAuthorInput = z.infer<typeof updateAdminAuthorSchema>
export type PaginationInput = z.infer<typeof paginationSchema>

export function validateAuthorSlug(slug: unknown) {
  return authorSlugSchema.parse(slug)
}

export function validatePagination(query: unknown) {
  return paginationSchema.parse(query)
}
