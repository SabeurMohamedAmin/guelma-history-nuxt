import { z } from 'zod'
import { databaseUuidSchema } from '~~/shared/database-uuid'

/**
 * Zod schemas for article CRUD.
 *
 * Design notes:
 * - `publishedAt` accepts an ISO string **or** a Date; HTTP bodies always
 *   arrive as strings so we coerce with z.coerce.date().
 * - `slug` allows Arabic characters because the Arabic title is the primary
 *   slug source for this bilingual site.
 * - `coverImage` allows any non-empty string (relative path or absolute URL).
 */

const slugRegex = /^[\w\u0600-\u06FF]+(?:[-][\w\u0600-\u06FF]+)*$/

const imageVariantsSchema = z.object({
  thumbnail: z.string().url().max(2_048),
  slider: z.string().url().max(2_048),
  main: z.string().url().max(2_048),
  original: z.string().url().max(2_048),
}).strict()

/**
 * A single gallery media item: an image, an uploaded video, or a YouTube link.
 * `url` holds the file/page URL (or the YouTube watch/share URL).
 */
export const mediaItemSchema = z.object({
  type: z.enum(['image', 'video', 'youtube']).default('image'),
  url: z.string().trim().min(1, 'Media URL is required').max(2_048),
  publicId: z.string().trim().min(1).max(500).nullable().optional(),
  resourceType: z.enum(['image', 'video']).nullable().optional(),
  posterUrl: z.string().trim().min(1).max(2_048).nullable().optional(),
  imageVariants: imageVariantsSchema.nullable().optional(),
  captionAr: z.string().max(255).nullable().optional(),
  captionFr: z.string().max(255).nullable().optional(),
  position: z.number().int().min(0).optional(),
}).strict()

/**
 * A relation foreign key (category, author).
 *
 * The admin/author form fills these from a <v-select>. UUIDs remain strings
 * end-to-end so they are never coerced or lose precision. `null` (the select
 * was cleared) and an omitted field both mean "no relation".
 */
const relationId = databaseUuidSchema.nullable().optional()

export const createArticleSchema = z.object({
  titleAr: z.string().trim().min(1, 'Arabic title is required').max(255),
  titleFr: z.string().trim().min(1, 'French title is required').max(255),
  slug: z.string().trim().min(1).max(255).regex(slugRegex, 'Slug must be alphanumeric with hyphens').optional(),
  excerptAr: z.string().max(500).nullable().optional(),
  excerptFr: z.string().max(500).nullable().optional(),
  bodyAr: z.string().trim().min(1, 'Arabic body content is required').max(1_000_000),
  bodyFr: z.string().trim().min(1, 'French body content is required').max(1_000_000),
  coverImage: z.string().trim().min(1).max(2_048).nullable().optional(),
  coverImageVariants: imageVariantsSchema.nullable().optional(),
  categoryId: relationId,
  authorId: relationId,
  publishedAt: z.coerce.date().nullable().optional(),
  readingTime: z.number().int().min(0).optional(),
  tagIds: z.array(databaseUuidSchema).max(100).optional(),
  media: z.array(mediaItemSchema).max(200).optional(),
}).strict()

export const updateArticleSchema = createArticleSchema.partial().refine(
  value => Object.keys(value).length > 0,
  { message: 'No fields to update' },
)
export const revisionAwareUpdateArticleSchema = updateArticleSchema.extend({
  expectedRevision: z.number().int().positive(),
})

// Backward-compatible name used by the versioned Flutter route.
export const versionedUpdateArticleSchema = revisionAwareUpdateArticleSchema

/**
 * Autosave only accepts editable draft content. Publishing, ownership,
 * relations, media, slugs, and home-page placement require an explicit save.
 */
export const autosaveArticleSchema = z.object({
  expectedRevision: z.number().int().positive(),
  titleAr: z.string().trim().min(1, 'Arabic title is required').max(255).optional(),
  titleFr: z.string().trim().min(1, 'French title is required').max(255).optional(),
  excerptAr: z.string().max(500).nullable().optional(),
  excerptFr: z.string().max(500).nullable().optional(),
  bodyAr: z.string().trim().min(1, 'Arabic body content is required').max(1_000_000, 'Arabic body content is too large').optional(),
  bodyFr: z.string().trim().min(1, 'French body content is required').max(1_000_000, 'French body content is too large').optional(),
}).strict().refine(
  value => Object.keys(value).some(key => key !== 'expectedRevision'),
  { message: 'Autosave requires at least one editable field.' },
)

export const articlesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  categoryId: databaseUuidSchema.optional(),
  // Category *slug* filter (the home/article pages pass a slug, not an id).
  category: z.string().optional(),
  authorId: databaseUuidSchema.optional(),
  tagId: databaseUuidSchema.optional(),
  // featured=true → published articles only (used by hero sections).
  featured: z.coerce.boolean().optional(),
  status: z.enum(['published', 'draft', 'all']).default('all'),
  sortBy: z.enum(['createdAt', 'updatedAt', 'publishedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateArticleInput = z.infer<typeof createArticleSchema>
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>
export type VersionedUpdateArticleInput = z.infer<typeof versionedUpdateArticleSchema>
export type ArticlesQueryInput = z.infer<typeof articlesQuerySchema>

export function validateCreateArticle(data: unknown) {
  return createArticleSchema.parse(data)
}

export function validateUpdateArticle(data: unknown) {
  return updateArticleSchema.parse(data)
}

export function validateArticlesQuery(query: unknown) {
  return articlesQuerySchema.parse(query)
}
