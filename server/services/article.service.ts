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
 * Responsibilities: validation, slug/reading-time derivation, business-rule
 * orchestration, publishing side effects, and external media cleanup.
 * Drizzle persistence and row mapping belong to ArticleRepository.
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
    const articleId = await articleRepository.create(data, ownerId, slug, readingTime)
    const created = (await this.getById(articleId))!

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
    // Recompute the reading time when a body changed (FR first, then AR).
    const changedBody = data.bodyFr ?? data.bodyAr
    const readingTime = changedBody ? this.calcReadingTime(changedBody) : undefined

    await articleRepository.update(id, data, readingTime)

    // The old rows are gone from the DB; now free their Cloudinary assets so
    // repeated edits don't leak orphaned images/videos. Runs after the commit
    // and is best-effort (failures are logged inside the helper).
    if (data.media !== undefined) {
      await destroyManyFromCloudinary(this.toCloudinaryAssets(existing.media))
    }

    const updated = (await this.getById(id))!

    if (isFirstPublish(existing.publishedAt, updated.publishedAt)) {
      await this.sendNewsletterAlertsAfterPublish(updated)
    }

    return updated
  }

  async assertMediaCanBeDeleted(publicId: string): Promise<void> {
    if (await articleRepository.isMediaPublicIdReferenced(publicId)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: 'Media is currently referenced by an article.',
      })
    }
  }

  async updateWithRevision(
    id: string,
    input: UpdateArticleDto,
    expectedRevision: number,
    savedByUserId?: string,
    requireUnpublished = false,
  ): Promise<ArticleResponse> {
    const existing = await this.getById(id)
    if (!existing) throw createNotFoundError(id)
    const data = validateUpdateArticle(input)
    await this.validateRelationIds({ categoryId: data.categoryId, authorId: data.authorId, tagIds: data.tagIds })
    const changedBody = data.bodyFr ?? data.bodyAr
    const updated = await articleRepository.update(
      id,
      data,
      changedBody ? this.calcReadingTime(changedBody) : undefined,
      expectedRevision,
      savedByUserId,
      requireUnpublished,
    )
    if (!updated) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: requireUnpublished
          ? 'Article was published or changed by another editor. Reload and try again.'
          : 'Article was changed by another editor. Reload and try again.',
      })
    }

    if (data.media !== undefined) {
      await destroyManyFromCloudinary(this.toCloudinaryAssets(existing.media))
    }

    const result = (await this.getById(id))!
    if (isFirstPublish(existing.publishedAt, result.publishedAt)) {
      await this.sendNewsletterAlertsAfterPublish(result)
    }
    return result
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id)
    if (!existing) {
      throw createNotFoundError(id)
    }
    // Related tag/media rows cascade-delete through database constraints. The
    // repository owns persistence; the service then handles external
    // Cloudinary cleanup as a best-effort domain side effect.
    await articleRepository.deleteById(id)

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
    const missing = await articleRepository.findMissingRelations(input)

    if (missing.owner) throw createInvalidRelationError('ownerId')
    if (missing.category) throw createInvalidRelationError('categoryId')
    if (missing.author) throw createInvalidRelationError('authorId')
    if (missing.tagIds.length > 0) throw createInvalidRelationError('tagIds')
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
