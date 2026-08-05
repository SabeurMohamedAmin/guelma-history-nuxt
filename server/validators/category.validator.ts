import { z } from 'zod'
import { databaseUuidSchema } from '~~/shared/database-uuid'

const categoryFields = z.object({
  nameAr: z.string().trim().min(1).max(200),
  nameFr: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(255),
  descriptionAr: z.string().trim().max(5_000).nullable().optional(),
  descriptionFr: z.string().trim().max(5_000).nullable().optional(),
  icon: z.string().trim().max(200).nullable().optional(),
  coverImage: z.string().trim().max(2_048).nullable().optional(),
  parentId: databaseUuidSchema.nullable().optional(),
}).strict()

export const createCategorySchema = categoryFields
export const updateCategorySchema = categoryFields.partial().refine(
  value => Object.keys(value).length > 0,
  { message: 'No fields to update' },
)
export const categoryIdSchema = databaseUuidSchema

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>
