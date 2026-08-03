import { subscriberService } from '~~/server/services/subscriber.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return { total: await subscriberService.count() }
})
