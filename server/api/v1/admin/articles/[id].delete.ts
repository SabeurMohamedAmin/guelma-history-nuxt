import { z } from 'zod'
import { articleService } from '~~/server/services/article.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** Delete an article and run shared best-effort Cloudinary cleanup. */
export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))
  await articleService.delete(id)
  return success({ deleted: true })
})
