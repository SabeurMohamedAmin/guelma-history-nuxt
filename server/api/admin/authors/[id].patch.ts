import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { authors } from '~~/server/db/schema'
import { databaseUuidSchema } from '~~/shared/database-uuid'

/**
 * PATCH /api/admin/authors/[id]
 * Partial update. Only the fields present in the body are changed.
 */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!databaseUuidSchema.safeParse(id).success) {
    throw createError({ statusCode: 400, message: 'Invalid author ID' })
  }

  const body = await readBody<{
    nameAr?: string
    nameFr?: string
    bioAr?: string | null
    bioFr?: string | null
    avatar?: string | null
  }>(event)

  const payload: Record<string, unknown> = {}
  if (body.nameAr !== undefined) payload.nameAr = body.nameAr.trim()
  if (body.nameFr !== undefined) payload.nameFr = body.nameFr.trim()
  if (body.bioAr !== undefined) payload.bioAr = body.bioAr?.trim() || null
  if (body.bioFr !== undefined) payload.bioFr = body.bioFr?.trim() || null
  if (body.avatar !== undefined) payload.avatar = body.avatar?.trim() || null

  if (Object.keys(payload).length === 0) {
    throw createError({ statusCode: 400, message: 'No fields to update' })
  }

  const [updated] = await db
    .update(authors)
    .set({ ...payload, updatedAt: new Date() })
    .where(eq(authors.id, id))
    .returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Author not found' })
  }

  return updated
})
