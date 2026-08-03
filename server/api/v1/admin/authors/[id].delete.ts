import { z } from 'zod'
import { authorService } from '~~/server/services/author.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))
  await authorService.deleteById(id)
  return success({ deleted: true })
})
