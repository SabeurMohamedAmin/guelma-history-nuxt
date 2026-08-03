import { z } from 'zod'
import { subscriberService } from '~~/server/services/subscriber.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))
  await subscriberService.updateStatus(id, await readBody(event))
  return success({ updated: true })
})
