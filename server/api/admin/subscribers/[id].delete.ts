import { subscriberService } from '~~/server/services/subscriber.service'
import { databaseUuidSchema } from '~~/shared/database-uuid'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = databaseUuidSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 400, message: 'Invalid subscriber ID' })

  await subscriberService.delete(id.data)
  return null
})
