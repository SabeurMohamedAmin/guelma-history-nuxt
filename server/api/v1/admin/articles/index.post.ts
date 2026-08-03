import { articleService } from '~~/server/services/article.service'
import { serializeMobileArticle } from '~~/server/serializers/article.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** Create a bilingual article owned by the authenticated administrator. */
export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  const article = await articleService.create(await readBody(event), principal.user.id)
  setResponseStatus(event, 201)
  return success(serializeMobileArticle(article))
})
