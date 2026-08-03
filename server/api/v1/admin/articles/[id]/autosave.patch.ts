import { createHash } from 'node:crypto'
import { z } from 'zod'
import { mobileArticleSaveIdempotencyRepository } from '~~/server/repositories/mobile-article-save-idempotency.repository'
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
  const principal = await requireMobileAdmin(event)
  const key = getHeader(event, 'idempotency-key')?.trim()
  if (!key || !/^[A-Za-z0-9._-]{16,100}$/.test(key)) {
    throw createError({ statusCode: 400, message: 'A valid Idempotency-Key header is required.' })
  }

  const id = z.uuid().parse(getRouterParam(event, 'id'))
  const parsed = autosaveArticleSchema.parse(await readBody(event))
  const requestHash = createHash('sha256').update(JSON.stringify({ id, ...parsed })).digest('hex')
  await mobileArticleSaveIdempotencyRepository.cleanup()

  const previous = await mobileArticleSaveIdempotencyRepository.find(principal.user.id, key)
  if (previous) {
    if (previous.articleId !== id || previous.requestHash !== requestHash) {
      throw createError({ statusCode: 409, message: 'Idempotency key was already used for another save.' })
    }
    if (!previous.responseJson) {
      throw createError({ statusCode: 409, message: 'Save with this idempotency key is still processing.' })
    }
    return success(JSON.parse(previous.responseJson))
  }

  const { expectedRevision, ...draft } = parsed
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

  const claimed = await mobileArticleSaveIdempotencyRepository.claim(
    principal.user.id,
    id,
    key,
    requestHash,
  )
  if (!claimed) {
    throw createError({ statusCode: 409, message: 'Save with this idempotency key is already processing.' })
  }

  try {
    const article = await articleService.updateWithRevision(id, draft, expectedRevision)
    const response = serializeMobileArticle(article)
    await mobileArticleSaveIdempotencyRepository.complete(principal.user.id, key, response)
    return success(response)
  }
  catch (error) {
    await mobileArticleSaveIdempotencyRepository.remove(principal.user.id, key)
    throw error
  }
})
