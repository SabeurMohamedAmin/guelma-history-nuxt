import type { H3Event } from 'h3'
import { and, desc, eq } from 'drizzle-orm'
import { db } from '~~/server/db'
import { bookmarks } from '~~/server/db/schema/bookmarks'
import { articles } from '~~/server/db/schema/articles'
import { requireRole } from '~~/server/utils/auth'

/**
 * Domain logic for the personal reading list (bookmarks).
 *
 * The API boundary references articles by their PUBLIC SLUG (stable, readable,
 * URL-friendly) — never by the internal database id. Each function resolves
 * the slug to the internal id once, up front, and 404s when the article is
 * gone; the numeric id never leaves this layer.
 *
 * Every function resolves the acting user from the session via
 * `requireRole(event, 'user')` (401 when there is no session) — the user id is
 * never read from the request, so a client can only ever act on its own list.
 * Mirrors the structure of `server/utils/comments.ts`: thin handlers delegate
 * here.
 *
 * Note: unlike writing a comment/vote, the reading list intentionally does NOT
 * require a completed profile. Hydration runs on every page load for any
 * logged-in user (including OAuth sign-ups still finishing onboarding), so
 * gating it on `profileCompleted` would 409 those valid sessions.
 */

/** A reading-list entry: the saved article plus when it was saved. */
export interface BookmarkListItem {
  id: number
  slug: string
  titleAr: string
  titleFr: string
  coverImage: string | null
  readingTime: number
  publishedAt: Date | null
  savedAt: Date
}

/** Resolve an article's public slug to its internal id, or throw 404. */
async function findArticleIdBySlug(articleSlug: string): Promise<number> {
  const article = await db.query.articles.findFirst({
    where: eq(articles.slug, articleSlug),
    columns: { id: true },
  })
  if (!article) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Article not found.' })
  }
  return article.id
}

/**
 * Save an article (by slug) to the current user's reading list.
 *
 * Idempotent: `onConflictDoNothing` against the unique (userId, articleId)
 * index means saving the same article twice is a no-op, never a duplicate or a
 * 500. Returns the resulting saved state so the client can reconcile.
 */
export async function addBookmark(event: H3Event, articleSlug: string): Promise<{ bookmarked: true }> {
  const user = await requireRole(event, 'user')
  const articleId = await findArticleIdBySlug(articleSlug)

  await db
    .insert(bookmarks)
    .values({ userId: user.id, articleId })
    .onConflictDoNothing({ target: [bookmarks.userId, bookmarks.articleId] })

  return { bookmarked: true }
}

/**
 * Remove an article (by slug) from the current user's reading list.
 *
 * Also idempotent: deleting a bookmark that isn't there simply affects no rows.
 */
export async function removeBookmark(event: H3Event, articleSlug: string): Promise<{ bookmarked: false }> {
  const user = await requireRole(event, 'user')
  const articleId = await findArticleIdBySlug(articleSlug)

  await db
    .delete(bookmarks)
    .where(and(eq(bookmarks.userId, user.id), eq(bookmarks.articleId, articleId)))

  return { bookmarked: false }
}

/** Whether the current user has saved a given article (by slug). */
export async function isBookmarked(event: H3Event, articleSlug: string): Promise<boolean> {
  const user = await requireRole(event, 'user')
  const articleId = await findArticleIdBySlug(articleSlug)

  const row = await db.query.bookmarks.findFirst({
    where: and(eq(bookmarks.userId, user.id), eq(bookmarks.articleId, articleId)),
    columns: { id: true },
  })

  return row !== undefined
}

/**
 * The current user's full reading list, newest-saved first. Returns just the
 * fields the list/card UI needs (title/slug/cover/reading time), never the
 * whole article row.
 */
export async function listBookmarks(event: H3Event): Promise<BookmarkListItem[]> {
  const user = await requireRole(event, 'user')

  const rows = await db
    .select({
      id: articles.id,
      slug: articles.slug,
      titleAr: articles.titleAr,
      titleFr: articles.titleFr,
      coverImage: articles.coverImage,
      readingTime: articles.readingTime,
      publishedAt: articles.publishedAt,
      savedAt: bookmarks.createdAt,
    })
    .from(bookmarks)
    .innerJoin(articles, eq(bookmarks.articleId, articles.id))
    .where(eq(bookmarks.userId, user.id))
    .orderBy(desc(bookmarks.createdAt))

  return rows.map(row => ({ ...row, readingTime: row.readingTime ?? 0 }))
}

/**
 * The set of article SLUGS the current user has bookmarked. Powers the store's
 * initial hydration so every visible save button shows the right state at once.
 */
export async function listBookmarkedArticleSlugs(event: H3Event): Promise<string[]> {
  const user = await requireRole(event, 'user')

  const rows = await db
    .select({ slug: articles.slug })
    .from(bookmarks)
    .innerJoin(articles, eq(bookmarks.articleId, articles.id))
    .where(eq(bookmarks.userId, user.id))

  return rows.map(row => row.slug)
}
