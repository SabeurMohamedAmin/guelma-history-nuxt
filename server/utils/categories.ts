import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema'

/** Confirm that an optional parent UUID exists and cannot create a cycle. */
export async function validateCategoryParent(
  categoryId: string | undefined,
  parentId: string | null | undefined,
): Promise<void> {
  if (!parentId) return

  const visited = new Set<string>()
  let currentId: string | null = parentId

  while (currentId) {
    if (currentId === categoryId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'The selected parent would create a category hierarchy cycle.',
      })
    }

    if (visited.has(currentId)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: 'The existing category hierarchy contains a cycle.',
      })
    }
    visited.add(currentId)

    const parent = await db.query.categories.findFirst({
      where: eq(categories.id, currentId),
      columns: { parentId: true },
    })

    if (!parent) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request',
        message: 'parentId contains an unknown UUID.',
      })
    }

    currentId = parent.parentId
  }
}
