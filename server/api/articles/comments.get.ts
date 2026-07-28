import { and, desc, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articleComments, articles } from '~~/server/db/schema'
import { toH3Error } from '~~/server/utils/handleError'

export default defineEventHandler(async (event) => {
  try {
    const { slug } = getQuery(event)

    if (!slug || typeof slug !== 'string') {
      throw createError({ statusCode: 400, statusMessage: 'Article slug is required' })
    }

    const article = await db.query.articles.findFirst({
      where: eq(articles.slug, slug),
      columns: { id: true },
    })

    if (!article) {
      throw createError({ statusCode: 404, statusMessage: 'Article not found' })
    }

    const comments = await db.query.articleComments.findMany({
      where: and(eq(articleComments.articleId, article.id), eq(articleComments.status, 'approved')),
      columns: { id: true, name: true, message: true, createdAt: true },
      orderBy: [desc(articleComments.createdAt)],
      limit: 50,
    })

    return { success: true, data: comments }
  }
  catch (error) {
    return toH3Error(error)
  }
})
