import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema/categories'

/**
 * GET /api/author/categories
 * Category options ({ id, nameAr, nameFr }) for the author article form select.
 *
 * Author-scoped counterpart to /api/admin/categories. Minimal projection (no
 * article counts) since the form only needs id + bilingual name.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, 'author')

  return db
    .select({
      id: categories.id,
      nameAr: categories.nameAr,
      nameFr: categories.nameFr,
    })
    .from(categories)
    .orderBy(categories.nameAr)
})
