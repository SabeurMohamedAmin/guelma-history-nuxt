/**
 * GET /api/author/authors
 * Byline options ({ id, name }) for the author article form selects.
 *
 * Author-scoped counterpart to /api/admin/authors so authors can pick a byline
 * without calling an admin-guarded endpoint. Read-only list of all bylines.
 */
import { db } from '~~/server/db'

export default defineEventHandler(async (event) => {
  await requireRole(event, 'author')

  const rows = await db.query.authors.findMany({
    columns: { id: true, nameAr: true, nameFr: true },
  })

  return rows.map(row => ({
    id: row.id,
    name: row.nameFr || row.nameAr,
  }))
})
