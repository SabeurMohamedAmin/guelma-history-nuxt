import { eq, inArray } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articles, articleTags, articleMedia, authors, categories, tags, users } from '~~/server/db/schema'
import { articleRepository } from '~~/server/repositories/article.repository'
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
    return articleRepository.findAll(params, ownerId)
  }

  async getById(id: string): Promise<ArticleResponse | null> {
    return articleRepository.findById(id)
  }

  /** Resolve an article's UUID from its unique slug, or null if missing. */
  async resolveIdBySlug(slug: string): Promise<string | null> {
    return articleRepository.findIdBySlug(slug)
  }

  /** List only the articles owned (created) by `ownerId` — the author's view. */
  async getAllByOwner(ownerId: string, params: ArticlesQueryParams): Promise<PaginatedResponse<ArticleResponse>> {
    return this.getAll(params, ownerId)
  }

  async getArticleBySlug(slug: string): Promise<ArticleResponse> {
    const article = await articleRepository.findBySlug(slug)

    if (!article) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Not Found',
        message: `Article ${slug} not found.`,
      })
    }

    return article
  }

  /** Total number of articles (for dashboard stats), optionally scoped to an owner. */
  async count(ownerId?: string): Promise<number> {
    return articleRepository.count(ownerId)
  }

  /** Most recently created articles, shaped for the dashboard list. */
  async getRecent(limit = 5, ownerId?: string): Promise<RecentArticleResponse[]> {
    return articleRepository.findRecent(limit, ownerId)
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
