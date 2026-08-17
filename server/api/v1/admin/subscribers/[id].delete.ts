import { subscriberService } from '~~/server/services/subscriber.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'
import { databaseUuidSchema } from '~~/shared/database-uuid'

export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const id = databaseUuidSchema.parse(getRouterParam(event, 'id'))
  await subscriberService.delete(id)
  return success({ deleted: true })
})
