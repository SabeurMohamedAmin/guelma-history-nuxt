import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or, type SQL } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articleMedia, articles, categories } from '~~/server/db/schema'
import type {
  ArticleMediaResponse,
  ArticleResponse,
  ArticlesQueryParams,
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
