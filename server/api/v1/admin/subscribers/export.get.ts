import { subscriberService } from '~~/server/services/subscriber.service'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** Explicit bearer authorization is required before exporting personal data. */
export default defineEventHandler(async (event) => {
  await requireMobileAdmin(event)
  setHeader(event, 'cache-control', 'private, no-store')
  setHeader(event, 'content-type', 'text/csv; charset=utf-8')
  setHeader(event, 'content-disposition', 'attachment; filename="subscribers.csv"')
  return subscriberService.exportActiveCsv()
})
