import { and, eq, ne } from 'drizzle-orm'
import { db } from '~~/server/db'
import { authors } from '~~/server/db/schema'
import { slugify } from '~~/server/utils/slugify'

/**
 * Build a slug from a name and guarantee it is unique across authors.
 *
 * Starts from slugify(nameFr); if that value is already taken it appends
 * -2, -3, ... until a free slug is found. When excludeId is provided the
 * author being updated is ignored, so renaming an author back to its own
 * slug does not count as a collision.
 */
export async function generateUniqueAuthorSlug(
  nameFr: string,
  excludeId?: number,
): Promise<string> {
  const base = slugify(nameFr) || 'author'
  let candidate = base
  let suffix = 1

  // Loop until we find a slug not used by another author.
  while (true) {
    const whereClause = excludeId
      ? and(eq(authors.slug, candidate), ne(authors.id, excludeId))
      : eq(authors.slug, candidate)

    const [existing] = await db
      .select({ id: authors.id })
      .from(authors)
      .where(whereClause)
      .limit(1)

    if (!existing) return candidate

    suffix += 1
    candidate = `${base}-${suffix}`
  }
}
