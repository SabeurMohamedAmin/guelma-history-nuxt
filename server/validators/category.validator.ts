import { z } from 'zod'
import { databaseUuidSchema } from '~~/shared/database-uuid'

const categoryFields = z.object({
  nameAr: z.string().trim().min(1),
  nameFr: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  descriptionAr: z.string().nullable().optional(),
  descriptionFr: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  parentId: databaseUuidSchema.nullable().optional(),
})

export const createCategorySchema = categoryFields
export const updateCategorySchema = categoryFields.partial()
export const categoryIdSchema = databaseUuidSchema

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
