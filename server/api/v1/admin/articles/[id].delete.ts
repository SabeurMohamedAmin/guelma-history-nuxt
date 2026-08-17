import { articleService } from '~~/server/services/article.service'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'
import { databaseUuidSchema } from '~~/shared/database-uuid'

/** Delete an article and run shared best-effort Cloudinary cleanup. */
export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const id = databaseUuidSchema.parse(getRouterParam(event, 'id'))
  await articleService.delete(id)
  return success({ deleted: true })
})
