import { z } from 'zod'
import { articleService } from '~~/server/services/article.service'
import { serializeMobileArticle } from '~~/server/serializers/article.serializer'
import { defineVersionedApiHandler } from '~~/server/utils/apiHandler'
import { success } from '~~/server/utils/apiResponse'
import { requireMobileAdmin } from '~~/server/utils/mobileAuthGuard'
import { autosaveArticleSchema } from '~~/server/validators/article.validator'

/**
 * Save draft text without exposing publishing or structural article fields.
 * Optimistic revision checks prevent Nuxt and Flutter from overwriting edits.
 */
export default defineVersionedApiHandler(async (event) => {
  await requireMobileAdmin(event)

  const id = z.uuid().parse(getRouterParam(event, 'id'))
  const { expectedRevision, ...draft } = autosaveArticleSchema.parse(await readBody(event))
  const current = await articleService.getById(id)

  if (!current) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: `Article ${id} not found.` })
  }

  if (current.publishedAt) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: 'Autosave is available only for unpublished drafts.',
    })
  }

  const article = await articleService.updateWithRevision(id, draft, expectedRevision)
  return success(serializeMobileArticle(article))
})
