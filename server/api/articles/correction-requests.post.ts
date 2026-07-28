import { eq } from 'drizzle-orm'
import { articleCorrectionRequestSchema } from '~~/server/validators/article-engagement.validator'
import { db } from '~~/server/db'
import { articleCorrectionRequests, articles } from '~~/server/db/schema'
import { toH3Error } from '~~/server/utils/handleError'

export default defineEventHandler(async (event) => {
  try {
    const input = articleCorrectionRequestSchema.parse(await readBody(event))
    // The API speaks slugs; resolve to the internal id for the insert below.
    const article = await db.query.articles.findFirst({ where: eq(articles.slug, input.articleSlug), columns: { id: true } })

    if (!article) throw createError({ statusCode: 404, statusMessage: 'Article not found' })

    await db.insert(articleCorrectionRequests).values({
      articleId: article.id,
      name: input.name,
      email: input.email,
      section: input.section || null,
      message: input.message,
    })

    return { success: true, message: 'Correction request sent successfully.' }
  }
  catch (error) {
    return toH3Error(error)
  }
})
