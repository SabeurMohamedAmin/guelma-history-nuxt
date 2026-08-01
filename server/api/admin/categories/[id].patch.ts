import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema'
import { databaseUuidSchema } from '~~/server/validators/database-uuid'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!databaseUuidSchema.safeParse(id).success) {
    throw createError({ statusCode: 400, message: 'Invalid category ID' })
  }

  const body = z.object({
    nameAr: z.string().optional(),
    nameFr: z.string().optional(),
    slug: z.string().optional(),
    descriptionAr: z.string().nullable().optional(),
    descriptionFr: z.string().nullable().optional(),
    icon: z.string().nullable().optional(),
    coverImage: z.string().nullable().optional(),
    parentId: databaseUuidSchema.nullable().optional(),
  }).parse(await readBody(event))

  const payload: Record<string, unknown> = {}
  if (body.nameAr !== undefined) payload.nameAr = body.nameAr.trim()
  if (body.nameFr !== undefined) payload.nameFr = body.nameFr.trim()
  if (body.slug !== undefined) payload.slug = body.slug.trim()
  if (body.descriptionAr !== undefined) payload.descriptionAr = body.descriptionAr
  if (body.descriptionFr !== undefined) payload.descriptionFr = body.descriptionFr
  if (body.icon !== undefined) payload.icon = body.icon
  if (body.coverImage !== undefined) payload.coverImage = body.coverImage
  if (body.parentId !== undefined) payload.parentId = body.parentId

  const [updated] = await db.update(categories).set({ ...payload, updatedAt: new Date() }).where(eq(categories.id, id)).returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Category not found' })
  }

  return updated
})
