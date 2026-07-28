import { sql, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema/categories'
import { articles } from '~~/server/db/schema/articles'

export default defineEventHandler(async () => {
  const rows = await db
    .select({
      id: categories.id,
      nameAr: categories.nameAr,
      nameFr: categories.nameFr,
      slug: categories.slug,
      descriptionAr: categories.descriptionAr,
      descriptionFr: categories.descriptionFr,
      icon: categories.icon,
      coverImage: categories.coverImage,
      parentId: categories.parentId,
      articleCount: sql <number>`count(${articles.id})`,
    })
    .from(categories)
    .leftJoin(articles, eq(articles.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.nameAr)

  return rows
})
