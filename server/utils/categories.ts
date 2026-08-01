import { eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { categories } from '~~/server/db/schema'

/** Confirm that an optional parent UUID identifies another category. */
export async function validateCategoryParent(
  categoryId: string | undefined,
  parentId: string | null | undefined,
): Promise<void> {
  if (!parentId) return

  if (categoryId === parentId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'A category cannot be its own parent.',
    })
  }

  const parent = await db.query.categories.findFirst({
    where: eq(categories.id, parentId),
    columns: { id: true },
  })

  if (!parent) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'parentId contains an unknown UUID.',
    })
  }
}
