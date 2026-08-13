import { z } from 'zod'
import { articleService } from '~~/server/services/article.service'
import { serializeMobileArticle } from '~~/server/serializers/article.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'
import { versionedUpdateArticleSchema } from '~~/server/validators/article.validator'

/** Update an article while reusing existing validation and publish rules. */
export default defineVersionedApiHandler(async (event) => {
  const principal = await requireMobileAdmin(event)
  const id = z.uuid().parse(getRouterParam(event, 'id'))
  const { expectedRevision, ...input } = versionedUpdateArticleSchema.parse(await readBody(event))
  const article = await articleService.updateWithRevision(
    id,
    input,
    expectedRevision,
    principal.user.id,
  )
  return success(serializeMobileArticle(article))
})
