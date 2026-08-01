import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    nameAr?: string
    nameFr?: string
    slug?: string
    descriptionAr?: string | null
    descriptionFr?: string | null
    icon?: string | null
    coverImage?: string | null
    parentId?: string | null
  }>(event)

  if (!body?.nameAr?.trim() || !body?.nameFr?.trim() || !body?.slug?.trim()) {
    throw createError({ statusCode: 400, message: 'nameAr, nameFr and slug are required' })
  }

  const [created] = await db.insert(categories).values({
    nameAr: body.nameAr.trim(),
    nameFr: body.nameFr.trim(),
    slug: body.slug.trim(),
    descriptionAr: body.descriptionAr ?? null,
    descriptionFr: body.descriptionFr ?? null,
    icon: body.icon ?? null,
    coverImage: body.coverImage ?? null,
    parentId: body.parentId ?? null,
  }).returning()

  return created
})
