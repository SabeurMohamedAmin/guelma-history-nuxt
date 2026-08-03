import { and, asc, count, eq, isNotNull, ne, sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articles, authors } from '~~/server/db/schema'
import type {
  CreateAdminAuthorInput,
  UpdateAdminAuthorInput,
} from '~~/server/validators/author.validator'

export class AuthorRepository {
  async count(): Promise<number> {
    const [row] = await db.select({ total: count() }).from(authors)
    return row?.total ?? 0
  }

  async findOptions() {
    const rows = await db.query.authors.findMany({
      columns: { id: true, nameAr: true, nameFr: true },
    })
    return rows.map(row => ({ id: row.id, name: row.nameFr || row.nameAr }))
  }

  async findAllWithCounts() {
    const articleCount = db.select({
      authorId: articles.authorId,
      total: sql<number>`count(*)`.as('total'),
      published: sql<number>`count(*) filter (where ${isNotNull(articles.publishedAt)})`.as('published'),
    }).from(articles).groupBy(articles.authorId).as('article_count')

    const rows = await db.select({
      id: authors.id,
      nameAr: authors.nameAr,
      nameFr: authors.nameFr,
      slug: authors.slug,
      bioAr: authors.bioAr,
      bioFr: authors.bioFr,
      avatar: authors.avatar,
      createdAt: authors.createdAt,
      updatedAt: authors.updatedAt,
      articleCount: sql<number>`coalesce(${articleCount.total}, 0)`,
      publishedCount: sql<number>`coalesce(${articleCount.published}, 0)`,
    }).from(authors)
      .leftJoin(articleCount, eq(articleCount.authorId, authors.id))
      .orderBy(asc(authors.nameFr), asc(authors.nameAr))

    return rows.map(row => ({
      ...row,
      articleCount: Number(row.articleCount),
      publishedCount: Number(row.publishedCount),
    }))
  }

  async findBySlugWithCounts(slug: string) {
    const rows = await this.findAllWithCounts()
    return rows.find(author => author.slug === slug) ?? null
  }

  async findIdentityBySlug(slug: string) {
    return await db.query.authors.findFirst({
      where: eq(authors.slug, slug),
      columns: { id: true, nameFr: true },
    }) ?? null
  }

  async slugExists(slug: string, excludeId?: string): Promise<boolean> {
    const where = excludeId
      ? and(eq(authors.slug, slug), ne(authors.id, excludeId))
      : eq(authors.slug, slug)
    const row = await db.query.authors.findFirst({ where, columns: { id: true } })
    return Boolean(row)
  }

  async create(input: CreateAdminAuthorInput, slug: string) {
    const [created] = await db.insert(authors).values({
      ...input,
      bioAr: input.bioAr || null,
      bioFr: input.bioFr || null,
      avatar: input.avatar || null,
      slug,
    }).returning()
    return created ?? null
  }

  async update(id: string, input: UpdateAdminAuthorInput & { slug?: string }) {
    const [updated] = await db.update(authors)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(authors.id, id))
      .returning()
    return updated ?? null
  }

  async countArticles(id: string): Promise<number> {
    const [row] = await db.select({ total: count() })
      .from(articles).where(eq(articles.authorId, id))
    return row?.total ?? 0
  }

  async delete(id: string): Promise<boolean> {
    const rows = await db.delete(authors).where(eq(authors.id, id)).returning({ id: authors.id })
    return rows.length > 0
  }
}

export const authorRepository = new AuthorRepository()
