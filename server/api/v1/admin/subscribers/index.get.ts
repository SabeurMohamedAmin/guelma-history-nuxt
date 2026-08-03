import { subscriberService } from '~~/server/services/subscriber.service'
import { serializeMobileSubscriber } from '~~/server/serializers/subscriber.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { normalizePagination, paginated } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const query = getQuery(event)
  const pagination = normalizePagination({ page: Number(query.page), pageSize: Number(query.pageSize) })
  const search = String(query.search ?? '').trim().toLocaleLowerCase()
  const status = String(query.status ?? 'all')
  if (!['all', 'active', 'pending', 'unsubscribed'].includes(status)) {
    throw createError({ statusCode: 400, message: 'Invalid subscriber status.' })
  }

  const rows = await subscriberService.findAll()
  const filtered = rows.filter(row =>
    (!search || row.email.toLocaleLowerCase().includes(search))
    && (status === 'all' || row.status === status),
  )
  const page = filtered.slice(pagination.offset, pagination.offset + pagination.pageSize)
  return paginated(page.map(serializeMobileSubscriber), pagination, filtered.length)
})
