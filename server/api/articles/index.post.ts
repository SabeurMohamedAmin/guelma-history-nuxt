// server/api/articles/index.post.ts
import { articleService } from '~~/server/services/article.service'
import { requireRole } from '~~/server/utils/auth'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * POST /api/articles
 * Create an article owned by the acting account (author or admin).
 *
 * Validation, slug and reading-time derivation all live in the service, so the
 * handler only resolves the owner and shapes the response. The owner is read
 * from the session, never from the body, so a client cannot create an article
 * on someone else's behalf.
 */
export default defineEventHandler(async (event) => {
  const user = await requireRole(event, 'author')

  try {
    const body = await readBody(event)
    const article = await articleService.create(body, user.id)

    setResponseStatus(event, 201)
    return {
      success: true,
      data: article,
      message: 'Article created successfully',
    }
  }
  catch (error) {
    return toH3Error(error)
  }
})
