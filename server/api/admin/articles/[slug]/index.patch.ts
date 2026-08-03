import { z } from 'zod'
import { articleService } from '~~/server/services/article.service'
import { toH3Error } from '~~/server/utils/handleError'
import { updateArticleSchema } from '~~/server/validators/article.validator'

const revisionAwareUpdateSchema = updateArticleSchema.extend({
  expectedRevision: z.number().int().positive(),
})

/**
 * PATCH /api/admin/articles/:slug
 * Partial update — only provided fields are changed.
 */
export default defineEventHandler(async (event) => {
  const admin = await requireAdmin(event)
  try {
    const slug = getRouterParam(event, 'slug')

    if (!slug) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request', message: 'Invalid article slug.' })
    }

    const id = await articleService.resolveIdBySlug(slug)
    if (id === null) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: `Article ${slug} not found.` })
    }

    const { expectedRevision, ...body } = revisionAwareUpdateSchema.parse(await readBody(event))
    return await articleService.updateWithRevision(id, body, expectedRevision, admin.id)
  }
  catch (error) {
    toH3Error(error)
  }
})
