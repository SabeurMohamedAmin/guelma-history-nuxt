import { authorService } from '~~/server/services/author.service'
import { databaseUuidSchema } from '~~/shared/database-uuid'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = databaseUuidSchema.safeParse(getRouterParam(event, 'id'))
  if (!id.success) throw createError({ statusCode: 400, message: 'Invalid author ID' })
  await authorService.deleteById(id.data)
  return null
})
