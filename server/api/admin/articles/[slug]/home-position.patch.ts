import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '~~/server/db'
import { articles } from '~~/server/db/schema'
import { requireAdmin } from '~~/server/utils/auth'

const bodySchema = z.object({
  position: z.number().int().min(0).max(3).nullable(),
})

/** Assign or remove one of the four curated home-page hero positions. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const slug = getRouterParam(event, 'slug')
  if (!slug) throw createError({ statusCode: 400, message: 'Invalid article slug.' })

  const { position } = bodySchema.parse(await readBody(event))

  return db.transaction(async (tx) => {
    const article = await tx.query.articles.findFirst({
      where: eq(articles.slug, slug),
      columns: { id: true, publishedAt: true },
    })

    if (!article) throw createError({ statusCode: 404, message: 'Article not found.' })
    if (position !== null && !article.publishedAt) {
      throw createError({ statusCode: 400, message: 'Publish the article before featuring it.' })
    }

    if (position !== null) {
      await tx.update(articles)
        .set({ homePosition: null, updatedAt: new Date() })
        .where(eq(articles.homePosition, position))
    }

    const [updated] = await tx.update(articles)
      .set({ homePosition: position, updatedAt: new Date() })
      .where(eq(articles.id, article.id))
      .returning({ homePosition: articles.homePosition })

    return updated
  })
})
