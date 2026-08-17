import { articleService } from '~~/server/services/article.service'
import { serializeMobileArticle } from '~~/server/serializers/article.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'
import { databaseUuidSchema } from '~~/shared/database-uuid'

/**
 * Get an article by its stable database UUID.
 *
 * The id is checked with `databaseUuidSchema`, never `z.uuid()`: ids migrated
 * from the old integer keys are deterministic MD5 UUIDs and carry no RFC
 * version bits, so `z.uuid()` rejected them with a 400 before the article was
 * ever read.
 */
export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)
  const id = databaseUuidSchema.parse(getRouterParam(event, 'id'))
  const article = await articleService.getById(id)
  if (!article) throw createError({ statusCode: 404, message: 'Article not found.' })

  return success(serializeMobileArticle(article))
})
