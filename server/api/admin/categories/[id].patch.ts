import { categoryService } from '~~/server/services/category.service'
import { categoryIdSchema } from '~~/server/validators/category.validator'

/** PATCH /api/admin/categories/:id */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = categoryIdSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 400, message: 'Invalid category ID' })

  return categoryService.update(id.data, await readBody(event))
})
