import { categoryService } from '~~/server/services/category.service'
import { categoryIdSchema } from '~~/server/validators/category.validator'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const id = categoryIdSchema.parse(getRouterParam(event, 'id'))
  await categoryService.delete(id)
  return success({ deleted: true })
})
