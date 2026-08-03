import { db } from '~~/server/db'

/**
 * GET /api/admin/authors
 * Returns authors as { id, name } options for admin form selects.
 */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const rows = await db.query.authors.findMany({
    columns: { id: true, nameAr: true, nameFr: true },
  })

  return rows.map(row => ({
    id: row.id,
    name: row.nameFr || row.nameAr,
  }))
})
