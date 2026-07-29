import { z } from 'zod'

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
  thumbnail: z.string().url(),
  slider: z.string().url(),
  main: z.string().url(),
  original: z.string().url(),
})

/**
 * A single gallery media item: an image, an uploaded video, or a YouTube link.
 * `url` holds the file/page URL (or the YouTube watch/share URL).
 */
export const mediaItemSchema = z.object({
  type: z.enum(['image', 'video', 'youtube']).default('image'),
  url: z.string().trim().min(1, 'Media URL is required'),
  publicId: z.string().trim().min(1).nullable().optional(),
  resourceType: z.enum(['image', 'video']).nullable().optional(),
  posterUrl: z.string().trim().min(1).nullable().optional(),
  imageVariants: imageVariantsSchema.nullable().optional(),
  captionAr: z.string().max(255).nullable().optional(),
  captionFr: z.string().max(255).nullable().optional(),
  position: z.number().int().min(0).optional(),
})

/**
 * A relation foreign key (category, author).
 *
 * The admin/author form fills these from a <v-select>, which can hand the id
 * back as a digit string ("3") instead of a number, so the value is coerced
 * before the numeric checks — same approach as articlesQuerySchema below.
 * `null` (the select was cleared) and an omitted field both mean "no relation".
 */
const relationId = z.coerce.number().int().positive().nullable().optional()

export const createArticleSchema = z.object({
  titleAr: z.string().trim().min(1, 'Arabic title is required').max(255),
  titleFr: z.string().trim().min(1, 'French title is required').max(255),
  slug: z.string().trim().min(1).max(255).regex(slugRegex, 'Slug must be alphanumeric with hyphens').optional(),
  excerptAr: z.string().max(500).nullable().optional(),
  excerptFr: z.string().max(500).nullable().optional(),
  bodyAr: z.string().trim().min(1, 'Arabic body content is required'),
  bodyFr: z.string().trim().min(1, 'French body content is required'),
  coverImage: z.string().min(1).nullable().optional(),
  coverImageVariants: imageVariantsSchema.nullable().optional(),
  categoryId: relationId,
  authorId: relationId,
  publishedAt: z.coerce.date().nullable().optional(),
  readingTime: z.number().int().min(0).optional(),
  tagIds: z.array(z.number().int().positive()).optional(),
  media: z.array(mediaItemSchema).optional(),
})

export const updateArticleSchema = createArticleSchema.partial()

export const articlesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  // Category *slug* filter (the home/article pages pass a slug, not an id).
  category: z.string().optional(),
  authorId: z.coerce.number().int().positive().optional(),
  tagId: z.coerce.number().int().positive().optional(),
  // featured=true → published articles only (used by hero sections).
  featured: z.coerce.boolean().optional(),
  status: z.enum(['published', 'draft', 'all']).default('all'),
  sortBy: z.enum(['createdAt', 'updatedAt', 'publishedAt', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CreateArticleInput = z.infer<typeof createArticleSchema>
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>
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
