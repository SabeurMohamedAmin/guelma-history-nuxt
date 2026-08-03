import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema'
import { createCategorySchema } from '~~/server/validators/category.validator'
import { validateCategoryParent } from '~~/server/utils/categories'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const body = createCategorySchema.parse(await readBody(event))
  await validateCategoryParent(undefined, body.parentId)

  const [created] = await db.insert(categories).values({
    nameAr: body.nameAr,
    nameFr: body.nameFr,
    slug: body.slug,
    descriptionAr: body.descriptionAr ?? null,
    descriptionFr: body.descriptionFr ?? null,
    icon: body.icon ?? null,
    coverImage: body.coverImage ?? null,
    parentId: body.parentId ?? null,
  }).returning()

  return created
})
