// server/api/articles/[slug].get.ts
import type { H3Event } from 'h3'
import { articleService } from '~~/server/services/article.service'
import { requireArticleOwner } from '~~/server/utils/auth'
import { toH3Error } from '~~/server/utils/handleError'

/**
 * GET /api/articles/:slug
 * Public article page data.
 *
 * An unpublished article (publishedAt === null) is NOT public. It stays
 * readable for the admin and for the author who owns it, so previewing a draft
 * from the public page keeps working, and every other caller gets a plain 404.
 */
export default defineEventHandler(async (event) => {
  try {
    const slug = getRouterParam(event, 'slug')

    if (!slug) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'Article slug is required.',
      })
    }

    const article = await articleService.getArticleBySlug(slug)

    if (!article.publishedAt) {
      await assertMayReadDraft(event, article.id, slug)
    }

    // `lastSavedByUserId` is the internal id of the editor account that saved
    // last. The public page never uses it and it must not expose a user UUID
    // to every visitor, so it is dropped from the public payload.
    const { lastSavedByUserId: _actorId, ...publicArticle } = article

    return {
      success: true,
      data: publicArticle,
    }
  }
  catch (error) {
    return toH3Error(error)
  }
})

/**
 * Let a draft through only for the admin or its owning author.
 *
 * Any authorization failure is rewritten as 404 on purpose: a 401 or 403 would
 * confirm to an anonymous visitor that an unpublished article exists behind
 * that slug, and article slugs are predictable (they come from the title).
 */
async function assertMayReadDraft(event: H3Event, articleId: string, slug: string): Promise<void> {
  try {
    await requireArticleOwner(event, articleId)
  }
  catch {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: `Article ${slug} not found.`,
    })
  }
}
