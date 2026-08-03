import { z } from 'zod'
import { articleService } from '~~/server/services/article.service'
import { serializeMobileArticle } from '~~/server/serializers/article.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'

/** Get an article by its stable database UUID. */
export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))
  const article = await articleService.getById(id)
  if (!article) throw createError({ statusCode: 404, message: 'Article not found.' })

  return success(serializeMobileArticle(article))
})
