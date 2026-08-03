import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, or, type SQL } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articleMedia, articles, articleTags, authors, categories, tags, users } from '~~/server/db/schema'
import type {
  ArticleMediaResponse,
  ArticleResponse,
  ArticlesQueryParams,
  CreateArticleDto,
  UpdateArticleDto,
  PaginatedResponse,
  RecentArticleResponse,
} from '~~/server/types/article.types'

const MEDIA_ORDER: SQL[] = [asc(articleMedia.position), asc(articleMedia.id)]

const ARTICLE_WITH = {
  category: true,
  author: true,
  articleTags: { with: { tag: true } },
  media: { orderBy: MEDIA_ORDER },
} as const

type ArticleRow = NonNullable<
  Awaited<ReturnType<typeof db.query.articles.findFirst<{ with: typeof ARTICLE_WITH }>>>
>

/** Drizzle persistence and row mapping for articles. */
export interface ArticleRelationIds {
  ownerId?: string
  categoryId?: string | null
  authorId?: string | null
  tagIds?: string[]
}

export interface MissingArticleRelations {
  owner: boolean
  category: boolean
  author: boolean
  tagIds: string[]
}

export class ArticleRepository {
  async findAll(params: ArticlesQueryParams, ownerId?: string): Promise<PaginatedResponse<ArticleResponse>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params
    const offset = (page - 1) * limit
    const where = this.buildWhereClause(params, ownerId)
    const orderFn = sortOrder === 'asc' ? asc : desc

    const [rows, [totalRow]] = await Promise.all([
      db.query.articles.findMany({
        where,
        with: ARTICLE_WITH,
        limit,
        offset,
        orderBy: [orderFn(this.resolveOrderColumn(sortBy))],
      }),
      db.select({ count: count() }).from(articles).where(where),
    ])

    const total = totalRow?.count ?? 0

    return {
      data: rows.map(row => this.toResponse(row)),
      pagination: {
        currentPage: page,
        perPage: limit,
        total,
        lastPage: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1,
      },
    }
  }

  async findById(id: string): Promise<ArticleResponse | null> {
    const row = await db.query.articles.findFirst({
      where: eq(articles.id, id),
      with: ARTICLE_WITH,
    })

    return row ? this.toResponse(row) : null
  }

  async findBySlug(slug: string): Promise<ArticleResponse | null> {
    const row = await db.query.articles.findFirst({
      where: eq(articles.slug, slug),
      with: ARTICLE_WITH,
    })

    return row ? this.toResponse(row) : null
  }

  async findIdBySlug(slug: string): Promise<string | null> {
    const row = await db.query.articles.findFirst({
      where: eq(articles.slug, slug),
      columns: { id: true },
    })

    return row?.id ?? null
  }

  async create(
    input: CreateArticleDto,
    ownerId: string,
    slug: string,
    readingTime: number,
  ): Promise<string> {
    const { tagIds, media, slug: _slug, readingTime: _readingTime, ...fields } = input

    return db.transaction(async (tx) => {
      const [article] = await tx
        .insert(articles)
        .values({ ...fields, slug, readingTime, createdByUserId: ownerId })
        .returning({ id: articles.id })

      if (!article) throw new Error('Article insert did not return an id.')

      if (tagIds?.length) {
        await tx.insert(articleTags)
          .values(tagIds.map(tagId => ({ articleId: article.id, tagId })))
      }

      if (media?.length) {
        await tx.insert(articleMedia).values(this.toMediaRows(article.id, media))
      }

      return article.id
    })
  }

  async update(id: string, input: UpdateArticleDto, readingTime?: number, expectedRevision?: number): Promise<boolean> {
    const { tagIds, media, ...fields } = input

    await db.transaction(async (tx) => {
      const rows = await tx
        .update(articles)
        .set({
          ...fields,
          ...(readingTime !== undefined ? { readingTime } : {}),
          ...(expectedRevision !== undefined ? { revision: expectedRevision + 1 } : {}),
          updatedAt: new Date(),
        })
        .where(expectedRevision === undefined
          ? eq(articles.id, id)
          : and(eq(articles.id, id), eq(articles.revision, expectedRevision)))
        .returning({ id: articles.id })

      if (rows.length === 0) return false

      if (tagIds !== undefined) {
        await tx.delete(articleTags).where(eq(articleTags.articleId, id))
        if (tagIds.length > 0) {
          await tx.insert(articleTags)
            .values(tagIds.map(tagId => ({ articleId: id, tagId })))
        }
      }

      if (media !== undefined) {
        await tx.delete(articleMedia).where(eq(articleMedia.articleId, id))
        if (media.length > 0) {
          await tx.insert(articleMedia).values(this.toMediaRows(id, media))
        }
      }

      return true
    })
  }

  async deleteById(id: string): Promise<void> {
    await db.delete(articles).where(eq(articles.id, id))
  }

  async isMediaPublicIdReferenced(publicId: string): Promise<boolean> {
    const row = await db.query.articleMedia.findFirst({
      where: eq(articleMedia.publicId, publicId),
      columns: { id: true },
    })
    return Boolean(row)
  }

  async count(ownerId?: string): Promise<number> {
    const where = ownerId === undefined ? undefined : eq(articles.createdByUserId, ownerId)
    const [row] = await db.select({ count: count() }).from(articles).where(where)

    return row?.count ?? 0
  }

  async findRecent(limit = 5, ownerId?: string): Promise<RecentArticleResponse[]> {
    const rows = await db.query.articles.findMany({
      where: ownerId === undefined ? undefined : eq(articles.createdByUserId, ownerId),
      with: { category: true },
      limit,
      orderBy: [desc(articles.createdAt)],
    })

    return rows.map(row => ({
      id: row.id,
      slug: row.slug,
      title: row.titleFr || row.titleAr,
      category: row.category ? (row.category.nameFr || row.category.nameAr) : '—',
      publishedAt: (row.publishedAt ?? row.createdAt).toISOString(),
      status: row.publishedAt ? 'published' : 'draft',
    }))
  }

  /** Check whether supplied foreign keys point to existing rows. */
  async findMissingRelations(input: ArticleRelationIds): Promise<MissingArticleRelations> {
    const uniqueTagIds = [...new Set(input.tagIds ?? [])]

    const [owner, category, author, tagRows] = await Promise.all([
      input.ownerId
        ? db.query.users.findFirst({ where: eq(users.id, input.ownerId), columns: { id: true } })
        : Promise.resolve(undefined),
      input.categoryId
        ? db.query.categories.findFirst({ where: eq(categories.id, input.categoryId), columns: { id: true } })
        : Promise.resolve(undefined),
      input.authorId
        ? db.query.authors.findFirst({ where: eq(authors.id, input.authorId), columns: { id: true } })
        : Promise.resolve(undefined),
      uniqueTagIds.length > 0
        ? db.select({ id: tags.id }).from(tags).where(inArray(tags.id, uniqueTagIds))
        : Promise.resolve([]),
    ])

    const foundTagIds = new Set(tagRows.map(row => row.id))

    return {
      owner: Boolean(input.ownerId && !owner),
      category: Boolean(input.categoryId && !category),
      author: Boolean(input.authorId && !author),
      tagIds: uniqueTagIds.filter(id => !foundTagIds.has(id)),
    }
  }

  private toMediaRows(articleId: string, media: NonNullable<CreateArticleDto['media']>) {
    return media.map((item, index) => ({
      articleId,
      type: item.type,
      url: item.url.trim(),
      publicId: item.publicId?.trim() || null,
      resourceType: item.resourceType ?? null,
      posterUrl: item.posterUrl?.trim() || null,
      imageVariants: item.imageVariants ?? null,
      captionAr: item.captionAr?.trim() || null,
      captionFr: item.captionFr?.trim() || null,
      position: item.position ?? index,
    }))
  }

  private buildWhereClause(params: ArticlesQueryParams, ownerId?: string): SQL | undefined {
    const conditions: SQL[] = []

    if (ownerId !== undefined) conditions.push(eq(articles.createdByUserId, ownerId))

    if (params.search) {
      const pattern = `%${params.search}%`
      conditions.push(or(
        ilike(articles.titleAr, pattern),
        ilike(articles.titleFr, pattern),
      )!)
    }

    if (params.categoryId) conditions.push(eq(articles.categoryId, params.categoryId))
    if (params.category) {
      conditions.push(eq(
        articles.categoryId,
        db.select({ id: categories.id }).from(categories).where(eq(categories.slug, params.category)),
      ))
    }
    if (params.authorId) conditions.push(eq(articles.authorId, params.authorId))
    if (params.status === 'published') conditions.push(isNotNull(articles.publishedAt))
    if (params.status === 'draft') conditions.push(isNull(articles.publishedAt))

    return conditions.length > 0 ? and(...conditions) : undefined
  }

  private resolveOrderColumn(sortBy: ArticlesQueryParams['sortBy']) {
    const columns = {
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      publishedAt: articles.publishedAt,
      title: articles.titleAr,
    } as const

    return columns[sortBy ?? 'createdAt']
  }

  private toResponse(row: ArticleRow): ArticleResponse {
    return {
      id: row.id,
      titleAr: row.titleAr,
      titleFr: row.titleFr,
      slug: row.slug,
      excerptAr: row.excerptAr ?? null,
      excerptFr: row.excerptFr ?? null,
      bodyAr: row.bodyAr,
      bodyFr: row.bodyFr,
      coverImage: row.coverImage ?? null,
      coverImageVariants: row.coverImageVariants ?? null,
      homePosition: row.homePosition ?? null,
      publishedAt: row.publishedAt ?? null,
      readingTime: row.readingTime ?? 0,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      category: row.category
        ? { id: row.category.id, nameAr: row.category.nameAr, nameFr: row.category.nameFr, slug: row.category.slug }
        : null,
      author: row.author
        ? { id: row.author.id, nameAr: row.author.nameAr, nameFr: row.author.nameFr, slug: row.author.slug, avatar: row.author.avatar ?? null }
        : null,
      tags: row.articleTags.map(({ tag }) => ({
        id: tag.id,
        nameAr: tag.nameAr,
        nameFr: tag.nameFr,
        slug: tag.slug,
      })),
      media: row.media.map((media): ArticleMediaResponse => ({
        id: media.id,
        type: media.type,
        url: media.url,
        publicId: media.publicId ?? null,
        resourceType: media.resourceType ?? null,
        posterUrl: media.posterUrl ?? null,
        imageVariants: media.imageVariants ?? null,
        captionAr: media.captionAr ?? null,
        captionFr: media.captionFr ?? null,
        position: media.position,
      })),
    }
  }
}

export const articleRepository = new ArticleRepository()
