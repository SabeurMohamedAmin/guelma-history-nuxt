import { categoryService } from '~~/server/services/category.service'

/** GET /api/admin/categories/count */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { total: await categoryService.count() }
})
