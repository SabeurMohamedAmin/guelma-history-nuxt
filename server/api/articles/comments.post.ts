import { eq, sql } from 'drizzle-orm'
import { articleCommentSchema } from '~~/server/validators/article-engagement.validator'
import { db } from '~~/server/db'
import { articleComments, articles } from '~~/server/db/schema'
import { toH3Error } from '~~/server/utils/handleError'

export default defineEventHandler(async (event) => {
  try {
    const input = articleCommentSchema.parse(await readBody(event))
    // The API speaks slugs; resolve to the internal id for the insert below.
    const article = await db.query.articles.findFirst({ where: eq(articles.slug, input.articleSlug), columns: { id: true } })

    if (!article) throw createError({ statusCode: 404, statusMessage: 'Article not found' })

    await db.insert(articleComments).values({
      articleId: article.id,
      name: input.name,
      email: input.email || null,
      message: input.message,
      status: 'approved',
    })

    await db.update(articles).set({ commentCount: sql`${articles.commentCount} + 1`, updatedAt: new Date() }).where(eq(articles.id, article.id))

    return { success: true, message: 'Comment added successfully.' }
  }
  catch (error) {
    return toH3Error(error)
  }
})
