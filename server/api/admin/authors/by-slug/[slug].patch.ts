import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { authors } from '~~/server/db/schema'
import { generateUniqueAuthorSlug } from '~~/server/utils/author-slug'

/**
 * PATCH /api/admin/authors/by-slug/[slug]
 * Partial update addressed by slug. Only fields present in the body change.
 * When nameFr changes, the slug is regenerated (and kept unique).
 */
export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.trim()
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Invalid author slug' })
  }

  const body = await readBody<{
    nameAr?: string
    nameFr?: string
    bioAr?: string | null
    bioFr?: string | null
    avatar?: string | null
  }>(event)

  const [current] = await db
    .select({ id: authors.id, nameFr: authors.nameFr })
    .from(authors)
    .where(eq(authors.slug, slug))
    .limit(1)

  if (!current) {
    throw createError({ statusCode: 404, message: 'Author not found' })
  }

  const payload: Record<string, unknown> = {}
  if (body.nameAr !== undefined) payload.nameAr = body.nameAr.trim()
  if (body.bioAr !== undefined) payload.bioAr = body.bioAr?.trim() || null
  if (body.bioFr !== undefined) payload.bioFr = body.bioFr?.trim() || null
  if (body.avatar !== undefined) payload.avatar = body.avatar?.trim() || null

  if (body.nameFr !== undefined) {
    const nameFr = body.nameFr.trim()
    payload.nameFr = nameFr
    // Re-slug only when the French name actually changed.
    if (nameFr !== current.nameFr) {
      payload.slug = await generateUniqueAuthorSlug(nameFr, current.id)
    }
  }

  if (Object.keys(payload).length === 0) {
    throw createError({ statusCode: 400, message: 'No fields to update' })
  }

  const [updated] = await db
    .update(authors)
    .set({ ...payload, updatedAt: new Date() })
    .where(eq(authors.id, current.id))
    .returning()

  return updated
})
