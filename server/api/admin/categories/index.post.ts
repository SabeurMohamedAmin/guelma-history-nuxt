import { categoryService } from '~~/server/services/category.service'

/** POST /api/admin/categories */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return categoryService.create(await readBody(event))
})
