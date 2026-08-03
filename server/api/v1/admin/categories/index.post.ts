import { categoryService } from '~~/server/services/category.service'
import { serializeMobileCategory } from '~~/server/serializers/category.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const category = await categoryService.create(await readBody(event))
  setResponseStatus(event, 201)
  return success(serializeMobileCategory(category))
})
