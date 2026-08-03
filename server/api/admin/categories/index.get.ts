import { categoryService } from '~~/server/services/category.service'

/** GET /api/admin/categories */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return categoryService.findAll()
})
