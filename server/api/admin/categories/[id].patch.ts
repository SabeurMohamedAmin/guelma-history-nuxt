import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema'
import { categoryIdSchema, updateCategorySchema } from '~~/server/validators/category.validator'
import { validateCategoryParent } from '~~/server/utils/categories'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!categoryIdSchema.safeParse(id).success) {
    throw createError({ statusCode: 400, message: 'Invalid category ID' })
  }

  const parsedId = categoryIdSchema.parse(id)
  const body = updateCategorySchema.parse(await readBody(event))
  await validateCategoryParent(parsedId, body.parentId)

  const payload: Record<string, unknown> = {}
  if (body.nameAr !== undefined) payload.nameAr = body.nameAr.trim()
  if (body.nameFr !== undefined) payload.nameFr = body.nameFr.trim()
  if (body.slug !== undefined) payload.slug = body.slug.trim()
  if (body.descriptionAr !== undefined) payload.descriptionAr = body.descriptionAr
  if (body.descriptionFr !== undefined) payload.descriptionFr = body.descriptionFr
  if (body.icon !== undefined) payload.icon = body.icon
  if (body.coverImage !== undefined) payload.coverImage = body.coverImage
  if (body.parentId !== undefined) payload.parentId = body.parentId

  const [updated] = await db.update(categories).set({ ...payload, updatedAt: new Date() }).where(eq(categories.id, parsedId)).returning()

  if (!updated) {
    throw createError({ statusCode: 404, message: 'Category not found' })
  }

  return updated
})
