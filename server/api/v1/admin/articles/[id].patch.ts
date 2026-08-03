import { z } from 'zod'
import { articleService } from '~~/server/services/article.service'
import { serializeMobileArticle } from '~~/server/serializers/article.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** Update an article while reusing existing validation and publish rules. */
export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))
  const article = await articleService.update(id, await readBody(event))
  return success(serializeMobileArticle(article))
})
