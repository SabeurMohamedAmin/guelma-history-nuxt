import { z } from 'zod'
import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema'

const createCategorySchema = z.object({
  nameAr: z.string().trim().min(1),
  nameFr: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  descriptionAr: z.string().nullable().optional(),
  descriptionFr: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const body = createCategorySchema.parse(await readBody(event))

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
