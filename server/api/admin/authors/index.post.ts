import { db } from '~~/server/db'
import { authors } from '~~/server/db/schema'
import { generateUniqueAuthorSlug } from '~~/server/utils/author-slug'

/**
 * POST /api/admin/authors
 * Create a new author. nameAr and nameFr are required; bio/avatar are optional.
 * The slug is derived from nameFr and made unique automatically.
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    nameAr?: string
    nameFr?: string
    bioAr?: string | null
    bioFr?: string | null
    avatar?: string | null
  }>(event)

  if (!body?.nameAr?.trim() || !body?.nameFr?.trim()) {
    throw createError({ statusCode: 400, message: 'nameAr and nameFr are required' })
  }

  const nameFr = body.nameFr.trim()
  const slug = await generateUniqueAuthorSlug(nameFr)

  const [created] = await db.insert(authors).values({
    nameAr: body.nameAr.trim(),
    nameFr,
    slug,
    bioAr: body.bioAr?.trim() || null,
    bioFr: body.bioFr?.trim() || null,
    avatar: body.avatar?.trim() || null,
  }).returning()

  return created
})
