import { subscriberService } from '~~/server/services/subscriber.service'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const date = new Date().toISOString().slice(0, 10)
  setHeader(event, 'Content-Type', 'text/csv; charset=utf-8')
  setHeader(event, 'Content-Disposition', `attachment; filename="subscribers-${date}.csv"`)

  return subscriberService.exportActiveCsv()
})
