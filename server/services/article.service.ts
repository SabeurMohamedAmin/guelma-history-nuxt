import { and, asc, count, desc, eq, ilike, inArray, isNotNull, isNull, type SQL } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articles, articleTags, articleMedia, authors, categories, tags, users } from '~~/server/db/schema'
import { slugify } from '~~/server/utils/slugify'
import { destroyManyFromCloudinary } from '~~/server/utils/cloudinary'
import { sendPublishedArticleNewsletterAlerts } from '~~/server/utils/newsletter'
import { isFirstPublish } from '~~/server/utils/newsletterRules'
import {
  validateCreateArticle,
  validateUpdateArticle,
} from '~~/server/validators/article.validator'
import type {
  CreateArticleDto,
  UpdateArticleDto,
  ArticleResponse,
  ArticleMediaResponse,
  RecentArticleResponse,
  ArticlesQueryParams,
  PaginatedResponse,
} from '~~/server/types/article.types'

// Media is ordered by `position` so the gallery renders in the author-defined
// order. The order lives in its own `SQL[]` constant on purpose: inside the
// `as const` object below the array literal would become a readonly tuple,
// which Drizzle's `orderBy` option rejects (it expects a mutable array).
const MEDIA_ORDER: SQL[] = [asc(articleMedia.position), asc(articleMedia.id)]

// Relations loaded for a full article response.
const ARTICLE_WITH = {
  category: true,
  author: true,
  articleTags: { with: { tag: true } },
  media: { orderBy: MEDIA_ORDER },
} as const

// The exact row shape Drizzle returns for an article loaded with ARTICLE_WITH
// (base columns + joined category/author/tags/media). Inferred from the query
// builder so it stays in sync automatically if the relations change, and lets
// `toResponse` be fully typed without `any`.
type ArticleRow = NonNullable<
  Awaited<ReturnType<typeof db.query.articles.findFirst<{ with: typeof ARTICLE_WITH }>>>
>

/**
 * ArticleService — all article business logic in one place.
 *
 * Responsibilities: validation, slug/reading-time derivation, transaction
 * management, and shaping DB rows into ArticleResponse objects.
 * Endpoints stay thin by delegating entirely to this service.
 */
export class ArticleService {
  // ─── Reads ──────────────────────────────────────────────────────────────────

  /**
   * List articles, optionally scoped to a single owner.
   *
   * `ownerId` is passed as an argument (never from the query string) so callers
   * decide the scope: admin endpoints omit it (all articles), the author's
   * "My articles" list passes the acting user's id.
   */
  async getAll(params: ArticlesQueryParams, ownerId?: string): Promise<PaginatedResponse<ArticleResponse>> {
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = params
    const offset = (page - 1) * limit

    const where = this.buildWhereClause(params, ownerId)
    const orderColumn = this.resolveOrderColumn(sortBy)
    const orderFn = sortOrder === 'asc' ? asc : desc

    const [rows, [totalRow]] = await Promise.all([
      db.query.articles.findMany({
        where,
        with: ARTICLE_WITH,
        limit,
        offset,
        orderBy: [orderFn(orderColumn)],
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

  async getById(id: string): Promise<ArticleResponse | null> {
    const row = await db.query.articles.findFirst({
      where: eq(articles.id, id),
      with: ARTICLE_WITH,
    })
    return row ? this.toResponse(row) : null
  }

  /** Resolve an article's UUID from its unique slug, or null if missing. */
  async resolveIdBySlug(slug: string): Promise<string | null> {
    const row = await db.query.articles.findFirst({
      where: eq(articles.slug, slug),
      columns: { id: true },
    })
    return row?.id ?? null
  }

  /** List only the articles owned (created) by `ownerId` — the author's view. */
  async getAllByOwner(ownerId: string, params: ArticlesQueryParams): Promise<PaginatedResponse<ArticleResponse>> {
    return this.getAll(params, ownerId)
  }

  async getArticleBySlug(slug: string): Promise<ArticleResponse> {
    const row = await db.query.articles.findFirst({
      where: eq(articles.slug, slug),
      with: ARTICLE_WITH,
    })

    if (!row) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Article ${slug} not found.`,
      })
    }

    return this.toResponse(row)
  }

  /** Total number of articles (for dashboard stats), optionally scoped to an owner. */
  async count(ownerId?: string): Promise<number> {
    const where = ownerId === undefined ? undefined : eq(articles.createdByUserId, ownerId)
    const [row] = await db.select({ count: count() }).from(articles).where(where)
    return row?.count ?? 0
  }

  /** Most recently created articles, shaped for the dashboard list. */
  async getRecent(limit = 5, ownerId?: string): Promise<RecentArticleResponse[]> {
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

  // ─── Writes ─────────────────────────────────────────────────────────────────

  /**
   * Create an article owned by `ownerId` (the account that created it). The
   * owner is required because articles.createdByUserId is NOT NULL and drives
   * the per-author ownership authorization.
   */
  async create(input: CreateArticleDto, ownerId: string): Promise<ArticleResponse> {
    // Zod throws ZodError on invalid input — endpoints catch it and map to 400.
    const data = validateCreateArticle(input)
    await this.validateRelationIds({
      ownerId,
      categoryId: data.categoryId,
      authorId: data.authorId,
      tagIds: data.tagIds,
    })

    const slug = data.slug ?? slugify(data.titleFr)
    // Reading time is estimated from the French body, falling back to Arabic.
    const readingTime = data.readingTime ?? this.calcReadingTime(data.bodyFr || data.bodyAr)
    const { tagIds, media, slug: _slug, readingTime: _rt, ...fields } = data

    // postgres-js transactions are async: await every query inside the callback.
    const newArticle = await db.transaction(async (tx) => {
      const [article] = await tx
        .insert(articles)
        .values({ ...fields, slug, readingTime, createdByUserId: ownerId })
        .returning()

      if (article && tagIds && tagIds.length > 0) {
        await tx.insert(articleTags)
          .values(tagIds.map(tagId => ({ articleId: article.id, tagId })))
      }

      if (article && media && media.length > 0) {
        await tx.insert(articleMedia).values(this.toMediaRows(article.id, media))
      }

      return article!
    })

    const created = (await this.getById(newArticle.id))!

    if (created.publishedAt) {
      await this.sendNewsletterAlertsAfterPublish(created)
    }

    return created
  }

  async update(id: string, input: UpdateArticleDto): Promise<ArticleResponse> {
    const existing = await this.getById(id)
    if (!existing) {
      throw createNotFoundError(id)
    }

    const data = validateUpdateArticle(input)
    await this.validateRelationIds({
      categoryId: data.categoryId,
      authorId: data.authorId,
      tagIds: data.tagIds,
    })
    const { tagIds, media, ...fields } = data

    // Recompute the reading time when a body changed (FR first, then AR).
    const changedBody = data.bodyFr ?? data.bodyAr
    const readingTime = changedBody ? this.calcReadingTime(changedBody) : undefined

    // postgres-js transactions are async: await every query inside the callback.
    await db.transaction(async (tx) => {
      await tx
        .update(articles)
        .set({ ...fields, ...(readingTime ? { readingTime } : {}), updatedAt: new Date() })
        .where(eq(articles.id, id))

      if (tagIds !== undefined) {
        await tx.delete(articleTags).where(eq(articleTags.articleId, id))
        if (tagIds.length > 0) {
          await tx.insert(articleTags)
            .values(tagIds.map(tagId => ({ articleId: id, tagId })))
        }
      }

      // Replace the whole gallery when `media` is provided (omit it to keep
      // the existing media untouched).
      if (media !== undefined) {
        await tx.delete(articleMedia).where(eq(articleMedia.articleId, id))
        if (media.length > 0) {
          await tx.insert(articleMedia).values(this.toMediaRows(id, media))
        }
      }
    })

    // The old rows are gone from the DB; now free their Cloudinary assets so
    // repeated edits don't leak orphaned images/videos. Runs after the commit
    // and is best-effort (failures are logged inside the helper).
    if (media !== undefined) {
      await destroyManyFromCloudinary(this.toCloudinaryAssets(existing.media))
    }

    const updated = (await this.getById(id))!

    if (isFirstPublish(existing.publishedAt, updated.publishedAt)) {
      await this.sendNewsletterAlertsAfterPublish(updated)
    }

    return updated
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id)
    if (!existing) {
      throw createNotFoundError(id)
    }
    // articleTags and articleMedia cascade-delete via FK constraints defined in
    // the schema. Deleting the rows does not touch Cloudinary, so free the
    // uploaded assets explicitly (best-effort) to avoid orphaned storage.
    await db.delete(articles).where(eq(articles.id, id))

    await destroyManyFromCloudinary(this.toCloudinaryAssets(existing.media))
  }

  /**
   * Map stored media rows to Cloudinary assets for deletion. Prefer the
   * resource_type captured at upload time; fall back to inferring it from the
   * display `type` for legacy rows saved before that column existed.
   */
  private toCloudinaryAssets(media: ArticleMediaResponse[]) {
    return media.map(item => ({
      publicId: item.publicId ?? '',
      type: item.resourceType ?? (item.type === 'video' ? 'video' : 'image'),
    }))
  }

  // ─── Slug-based writes (admin layer) ────────────────────────────────────────
  // The slug is the public-facing identifier. These helpers resolve it to the
  // internal primary key, then delegate to the id-based methods so all the
  // transaction and relation logic stays in a single place.

  async updateBySlug(slug: string, input: UpdateArticleDto): Promise<ArticleResponse> {
    const id = await this.resolveIdBySlug(slug)
    if (id === null) {
      throw createNotFoundError(slug)
    }
    return this.update(id, input)
  }

  async deleteBySlug(slug: string): Promise<void> {
    const id = await this.resolveIdBySlug(slug)
    if (id === null) {
      throw createNotFoundError(slug)
    }
    await this.delete(id)
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Confirm that well-formed UUIDs also identify real relationship rows.
   * Zod validates shape; this validates referential meaning before CockroachDB
   * would otherwise return a low-level foreign-key error.
   */
  private async validateRelationIds(input: {
    ownerId?: string
    categoryId?: string | null
    authorId?: string | null
    tagIds?: string[]
  }): Promise<void> {
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

    if (input.ownerId && !owner) throw createInvalidRelationError('ownerId')
    if (input.categoryId && !category) throw createInvalidRelationError('categoryId')
    if (input.authorId && !author) throw createInvalidRelationError('authorId')

    const foundTagIds = new Set(tagRows.map(row => row.id))
    const missingTagIds = uniqueTagIds.filter(id => !foundTagIds.has(id))
    if (missingTagIds.length > 0) throw createInvalidRelationError('tagIds')
  }

  /** Build the WHERE clause from optional query filters and an optional owner scope. */
  private buildWhereClause(params: ArticlesQueryParams, ownerId?: string): SQL | undefined {
    const conditions: SQL[] = []

    if (ownerId !== undefined) {
      conditions.push(eq(articles.createdByUserId, ownerId))
    }

    if (params.search) {
      // Case-insensitive title match (ILIKE) — Postgres LIKE is case-sensitive.
      const pattern = `%${params.search}%`
      conditions.push(ilike(articles.titleAr, pattern))
    }

    if (params.categoryId) {
      conditions.push(eq(articles.categoryId, params.categoryId))
    }

    // Category *slug* filter (the dashboard selects pass a slug, not an id).
    // Resolve it against the categories table via a correlated subquery so it
    // composes with the other conditions and the count query alike.
    if (params.category) {
      conditions.push(
        eq(
          articles.categoryId,
          db.select({ id: categories.id }).from(categories).where(eq(categories.slug, params.category)),
        ),
      )
    }

    if (params.authorId) {
      conditions.push(eq(articles.authorId, params.authorId))
    }

    if (params.status === 'published') {
      // publishedAt IS NOT NULL means published
      conditions.push(isNotNull(articles.publishedAt))
    }
    else if (params.status === 'draft') {
      conditions.push(isNull(articles.publishedAt))
    }

    return conditions.length > 0 ? and(...conditions) : undefined
  }

  /** Map sortBy key to the actual Drizzle column reference. */
  private resolveOrderColumn(sortBy: ArticlesQueryParams['sortBy']) {
    const map = {
      createdAt: articles.createdAt,
      updatedAt: articles.updatedAt,
      publishedAt: articles.publishedAt,
      title: articles.titleAr,
    } as const
    return map[sortBy ?? 'createdAt']
  }

  /** Normalize incoming media items into insertable rows for an article. */
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

  /** Send newsletter alerts without failing the article write if email fails. */
  private async sendNewsletterAlertsAfterPublish(article: ArticleResponse): Promise<void> {
    try {
      await sendPublishedArticleNewsletterAlerts({
        id: article.id,
        slug: article.slug,
        titleAr: article.titleAr,
        titleFr: article.titleFr,
      })
    }
    catch (error) {
      console.error('[newsletter] Failed to send published article alerts', {
        articleId: article.id,
        error,
      })
    }
  }

  /** Estimate reading time from word count at 200 wpm. */
  private calcReadingTime(body: string): number {
    const words = body.trim().split(/\s+/).length
    return Math.max(1, Math.ceil(words / 200))
  }

  /**
   * Map a raw DB row (with joined relations) to a clean ArticleResponse.
   *
   * `ArticleRow` describes the shape Drizzle returns for the article query plus
   * its joined relations (category, author, articleTags, media). Typing it here
   * keeps the mapper honest without resorting to `any`.
   */
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
      // No flat categoryId/authorId: the ids ship inside `category`/`author`
      // below (see the notice on ArticleResponse).
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
      tags: row.articleTags?.map(at => ({
        id: at.tag.id,
        nameAr: at.tag.nameAr,
        nameFr: at.tag.nameFr,
        slug: at.tag.slug,
      })) ?? [],
      media: row.media?.map((m): ArticleMediaResponse => ({
        id: m.id,
        type: m.type,
        url: m.url,
        publicId: m.publicId ?? null,
        resourceType: m.resourceType ?? null,
        posterUrl: m.posterUrl ?? null,
        imageVariants: m.imageVariants ?? null,
        captionAr: m.captionAr ?? null,
        captionFr: m.captionFr ?? null,
        position: m.position ?? 0,
      })) ?? [],
    }
  }
}

// ─── Module-level singleton ───────────────────────────────────────────────────
// One instance per server process; avoid constructing on every request.
export const articleService = new ArticleService()

// ─── Shared error factory ─────────────────────────────────────────────────────
function createNotFoundError(identifier: string) {
  return createError({ statusCode: 404, statusMessage: 'Not Found', message: `Article ${identifier} not found.` })
}

function createInvalidRelationError(field: string) {
  return createError({
    statusCode: 400,
    statusMessage: 'Bad Request',
    message: `${field} contains an unknown UUID.`,
  })
}
