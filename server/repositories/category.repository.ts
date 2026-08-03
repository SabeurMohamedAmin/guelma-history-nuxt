import { asc, count, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articles, categories } from '~~/server/db/schema'
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from '~~/server/validators/category.validator'

export class CategoryRepository {
  findAll() {
    return db.query.categories.findMany({
      orderBy: [asc(categories.nameFr), asc(categories.nameAr)],
    })
  }

  async count(): Promise<number> {
    const [row] = await db.select({ total: count() }).from(categories)
    return row?.total ?? 0
  }

  async findParentId(id: string): Promise<{ parentId: string | null } | null> {
    const row = await db.query.categories.findFirst({
      where: eq(categories.id, id),
      columns: { parentId: true },
    })
    return row ?? null
  }

  async create(input: CreateCategoryInput) {
    const [created] = await db.insert(categories).values({
      nameAr: input.nameAr,
      nameFr: input.nameFr,
      slug: input.slug,
      descriptionAr: input.descriptionAr ?? null,
      descriptionFr: input.descriptionFr ?? null,
      icon: input.icon ?? null,
      coverImage: input.coverImage ?? null,
      parentId: input.parentId ?? null,
    }).returning()

    return created ?? null
  }

  async update(id: string, input: UpdateCategoryInput) {
    const [updated] = await db.update(categories)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning()

    return updated ?? null
  }

  async countReferences(id: string): Promise<{ childCount: number, articleCount: number }> {
    const [[childRow], [articleRow]] = await Promise.all([
      db.select({ total: count() }).from(categories).where(eq(categories.parentId, id)),
      db.select({ total: count() }).from(articles).where(eq(articles.categoryId, id)),
    ])

    return {
      childCount: childRow?.total ?? 0,
      articleCount: articleRow?.total ?? 0,
    }
  }

  async delete(id: string): Promise<boolean> {
    const rows = await db.delete(categories)
      .where(eq(categories.id, id))
      .returning({ id: categories.id })

    return rows.length > 0
  }
}

export const categoryRepository = new CategoryRepository()
