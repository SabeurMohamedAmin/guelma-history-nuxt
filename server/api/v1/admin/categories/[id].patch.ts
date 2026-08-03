import { categoryService } from '~~/server/services/category.service'
import { serializeMobileCategory } from '~~/server/serializers/category.serializer'
import { categoryIdSchema } from '~~/server/validators/category.validator'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const id = categoryIdSchema.parse(getRouterParam(event, 'id'))
  return success(serializeMobileCategory(await categoryService.update(id, await readBody(event))))
})
