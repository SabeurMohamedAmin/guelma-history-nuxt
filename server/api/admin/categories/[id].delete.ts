import { categoryService } from '~~/server/services/category.service'
import { categoryIdSchema } from '~~/server/validators/category.validator'

/** DELETE /api/admin/categories/:id */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = categoryIdSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 400, message: 'Invalid category ID' })

  await categoryService.delete(id.data)
  return null
})
