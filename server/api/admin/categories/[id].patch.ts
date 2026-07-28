import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) {
    throw createError({ statusCode: 400, message: 'Invalid category ID' })
  }

  const body = await readBody<{
    nameAr?: string
    nameFr?: string
    slug?: string
    descriptionAr?: string | null
    descriptionFr?: string | null
    icon?: string | null
    coverImage?: string | null
    parentId?: number | null
  }>(event)

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
