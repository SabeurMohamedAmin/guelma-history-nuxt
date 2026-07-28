import type { H3Event } from 'h3'
import { and, asc, desc, eq, gt, inArray, lt, sql } from 'drizzle-orm'
import type { SQL, ExtractTablesWithRelations } from 'drizzle-orm'

import type { PgTransaction } from 'drizzle-orm/pg-core'
import type { PostgresJsQueryResultHKT } from 'drizzle-orm/postgres-js'
import { db } from '~~/server/db'
import type * as schema from '~~/server/db/schema'
import { articles } from '~~/server/db/schema/articles'
import { comments } from '~~/server/db/schema/comments'
import { commentVotes } from '~~/server/db/schema/comment-votes'
import { commentFlags } from '~~/server/db/schema/comment-flags'
import { hasRole } from '~~/shared/auth/roles'
import type { CommentSort, CommentSortOrder } from '~~/shared/types/comment'
import { requireCompleteUser } from '~~/server/utils/auth'
import type { SessionUser } from '~~/server/utils/auth'

/**
 * Domain logic for the realtime threaded comment system.
 *
 * Keeps every comment rule (threading math, ownership, vote toggling, soft
 * delete) in one place so the HTTP handlers and the websocket channel stay
 * thin. Mirrors the structure of `server/utils/auth.ts`.
 *
 * Authorization summary:
 * - guest                  -> cannot write (blocked by requireCompleteUser).
 * - user / author / admin  -> may post, reply, vote, flag.
 * - owner                  -> may edit/delete their own comment.
 * - admin                  -> may edit/delete ANY comment (full control).
 */

// ---------------------------------------------------------------------------
// Errors (one factory per case, same approach as auth.ts)
// ---------------------------------------------------------------------------

const forbidden = (message: string) =>
  createError({ statusCode: 403, statusMessage: 'Forbidden', message })

const notFound = (message: string) =>
  createError({ statusCode: 404, statusMessage: 'Not Found', message })

const badRequest = (message: string) =>
  createError({ statusCode: 400, statusMessage: 'Bad Request', message })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CommentRow = typeof comments.$inferSelect

/** The transaction handle passed to `db.transaction(async (tx) => ...)`. */
type Tx = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>

/** Placeholder body shown in place of a soft-deleted comment. */
export const DELETED_PLACEHOLDER = '[deleted]'

// ---------------------------------------------------------------------------
// Pure threading helpers (no DB) — kept exported so they can be unit-tested.
// ---------------------------------------------------------------------------

/**
 * Build a comment's materialized path from its parent's path and its own id.
 *
 * The path is "ancestorId/.../selfId". A root comment (no parent path) has a
 * path equal to its own id; a reply appends its id to the parent's path. This
 * is what lets us fetch a whole subtree with a single `path LIKE 'id/%'` query
 * instead of a recursive walk.
 *
 *   buildCommentPath('', 'a')        // 'a'        (root)
 *   buildCommentPath('a', 'b')       // 'a/b'      (reply to a)
 *   buildCommentPath('a/b', 'c')     // 'a/b/c'
 *
 * Ids are uuid strings; a uuid never contains '/', so the slash separator is
 * unambiguous.
 */
export function buildCommentPath(parentPath: string, selfId: string): string {
  return parentPath ? `${parentPath}/${selfId}` : selfId
}

/**
 * Parse the ancestor ids from a comment's materialized path. The path ends with
 * the comment's own id, so ancestors are every valid id in the path except
 * itself, kept in root-first order for the "show parent" breadcrumb.
 *
 *   parseAncestorIds('a/b/c', 'c') // ['a', 'b']
 *   parseAncestorIds('a', 'a')      // []  (a root has no ancestors)
 */
export function parseAncestorIds(path: string, selfId: string): string[] {
  return path
    .split('/')
    .filter(id => id.length > 0 && id !== selfId)
}

/**
 * Return the first row of a write result, throwing if it is empty. Drizzle's
 * `.returning()` is typed as an array, so a single-row insert/update still
 * yields `T | undefined`; this narrows it and fails loudly if the invariant
 * (exactly one row) is ever broken. Mirrors the helper in user-account.ts.
 */
function firstOrThrow<T>(rows: T[], message: string): T {
  const row = rows[0]
  if (!row) throw new Error(message)
  return row
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Fetch a comment by id or throw 404. */
async function findCommentOrThrow(id: string): Promise<CommentRow> {
  const comment = await db.query.comments.findFirst({ where: eq(comments.id, id) })
  if (!comment) throw notFound('Comment not found.')
  return comment
}

/**
 * Fetch a comment by id WITH its author display fields, or throw 404. Used
 * right after create/edit so the serialized payload (REST response AND the
 * websocket broadcast) always carries the author. Without this the author is
 * null, and the client can no longer tell the viewer owns the comment, so the
 * edit/delete buttons disappear after the first edit.
 */
async function findCommentWithAuthorOrThrow(id: string): Promise<CommentWithAuthor> {
  const comment = await db.query.comments.findFirst({
    where: eq(comments.id, id),
    with: { author: { columns: { id: true, username: true, displayName: true } } },
  })
  if (!comment) throw notFound('Comment not found.')
  return comment
}

/**
 * Resolve the public slug of an article by its internal id. Used by the
 * mutation handlers to key the realtime broadcast room — rooms are keyed by
 * slug, the same value the client subscribes with. Null when the article is
 * gone (broadcast is then skipped; the write itself already succeeded).
 */
export async function getArticleSlug(articleId: number): Promise<string | null> {
  const article = await db.query.articles.findFirst({
    where: eq(articles.id, articleId),
    columns: { slug: true },
  })
  return article?.slug ?? null
}

/**
 * May `user` modify (edit/delete) `comment`? True for the comment's author and
 * for any admin. Authors/users have no special power over others' comments.
 */
function canModify(user: SessionUser, comment: CommentRow): boolean {
  return comment.authorId === user.id || hasRole(user.role, 'admin')
}

/**
 * Recompute the denormalized vote tallies for one comment from comment_votes
 * and write them back. Always called inside the vote transaction so the
 * counters stay consistent with the underlying rows.
 */
async function syncVoteCounters(tx: Tx, commentId: string): Promise<void> {
  const [tally] = await tx
    .select({
      upvotes: sql<number>`coalesce(sum(case when ${commentVotes.value} = 1 then 1 else 0 end), 0)`,
      downvotes: sql<number>`coalesce(sum(case when ${commentVotes.value} = -1 then 1 else 0 end), 0)`,
    })
    .from(commentVotes)
    .where(eq(commentVotes.commentId, commentId))

  const upvotes = Number(tally?.upvotes ?? 0)
  const downvotes = Number(tally?.downvotes ?? 0)

  await tx
    .update(comments)
    .set({ upvotes, downvotes, score: upvotes - downvotes })
    .where(eq(comments.id, commentId))
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

/**
 * Create a comment or reply.
 *
 * `parentId` null = a new top-level comment. Otherwise the parent must exist
 * and belong to the SAME article (so a reply can never jump threads). The
 * materialized `path` and `depth` are derived from the parent once, here, and
 * never change afterwards.
 *
 * The body is assumed already sanitized + length-checked by the validator.
 */
export async function createComment(
  event: H3Event,
  input: { articleSlug: string, parentId?: string | null, body: string },
): Promise<CommentWithAuthor> {
  const user = await requireCompleteUser(event, 'user')

  // The API speaks slugs; resolve to the internal article id once, here.
  const article = await db.query.articles.findFirst({
    where: eq(articles.slug, input.articleSlug),
    columns: { id: true },
  })
  if (!article) throw notFound('Article not found.')

  // Resolve threading info from the parent (if this is a reply).
  let parentPath = ''
  let depth = 0
  if (input.parentId != null) {
    const parent = await findCommentOrThrow(input.parentId)
    if (parent.articleId !== article.id) {
      throw badRequest('Reply must belong to the same article as its parent.')
    }
    parentPath = parent.path
    depth = parent.depth + 1
  }

  // Mint the uuid up front so we can store the materialized path (which ends in
  // this id) in the SAME insert, instead of insert-then-update. A uuid never
  // contains '/', so it is a safe path segment.
  const id = crypto.randomUUID()
  const path = buildCommentPath(parentPath, id)

  const newId = await db.transaction(async (tx) => {
    const created = firstOrThrow(
      await tx
        .insert(comments)
        .values({
          id,
          articleId: article.id,
          parentId: input.parentId ?? null,
          authorId: user.id,
          body: input.body,
          depth,
          path,
        })
        .returning({ id: comments.id }),
      'Failed to create comment',
    )

    await tx
      .update(articles)
      .set({ commentCount: sql`${articles.commentCount} + 1`, updatedAt: new Date() })
      .where(eq(articles.id, article.id))

    return created.id
  })

  // Re-read WITH the author so the serialized node (REST response + websocket
  // broadcast) carries the author, like the list does.
  return findCommentWithAuthorOrThrow(newId)
}

// ---------------------------------------------------------------------------
// Edit
// ---------------------------------------------------------------------------

/**
 * Edit a comment body. Only the author or an admin may edit. Editing stamps
 * `editedAt`, which drives the "(edited)" label on the client. A deleted
 * comment cannot be edited.
 */
export async function editComment(
  event: H3Event,
  commentId: string,
  body: string,
): Promise<CommentWithAuthor> {
  const user = await requireCompleteUser(event, 'user')
  const comment = await findCommentOrThrow(commentId)

  if (comment.status === 'deleted') throw badRequest('Cannot edit a deleted comment.')
  if (!canModify(user, comment)) throw forbidden('You can only edit your own comment.')

  await db
    .update(comments)
    .set({ body, editedAt: new Date() })
    .where(eq(comments.id, commentId))

  // Re-read with the author so the serialized payload (REST + websocket) keeps
  // the author; otherwise the client loses ownership and the edit/delete
  // buttons disappear after the first edit.
  return findCommentWithAuthorOrThrow(commentId)
}

// ---------------------------------------------------------------------------
// Delete (soft)
// ---------------------------------------------------------------------------

/**
 * Soft-delete a comment. The row is kept (so replies and the thread shape
 * survive) but flagged `deleted` and its body blanked; the client renders a
 * "[deleted]" placeholder. Only the author or an admin may delete.
 *
 * Idempotent: deleting an already-deleted comment is a no-op success.
 */
export async function deleteComment(event: H3Event, commentId: string): Promise<CommentRow> {
  const user = await requireCompleteUser(event, 'user')
  const comment = await findCommentOrThrow(commentId)

  if (!canModify(user, comment)) throw forbidden('You can only delete your own comment.')
  if (comment.status === 'deleted') return comment

  return firstOrThrow(
    await db
      .update(comments)
      .set({ status: 'deleted', body: '', deletedAt: new Date() })
      .where(eq(comments.id, commentId))
      .returning(),
    'Failed to delete comment',
  )
}

// ---------------------------------------------------------------------------
// Vote
// ---------------------------------------------------------------------------

export interface VoteResult {
  commentId: string
  upvotes: number
  downvotes: number
  score: number
  /** This user's resulting vote: 1, -1, or 0 (cleared). */
  userValue: -1 | 0 | 1
}

/**
 * Cast or toggle a vote on a comment.
 *
 * `intent` is what the user pressed: +1 (up), -1 (down), or 0 (explicit clear).
 * Toggling is resolved against the existing vote: pressing the same arrow again
 * clears it (up -> none), pressing the opposite arrow flips it (up -> down).
 *
 * The row is created/updated/deleted and the denormalized counters on the
 * comment are recomputed in the SAME transaction, so a count can never drift
 * from the underlying votes.
 */
export async function voteComment(
  event: H3Event,
  commentId: string,
  intent: -1 | 0 | 1,
): Promise<VoteResult> {
  const user = await requireCompleteUser(event, 'user')
  const comment = await findCommentOrThrow(commentId)
  if (comment.status === 'deleted') throw badRequest('Cannot vote on a deleted comment.')

  return db.transaction(async (tx) => {
    const existing = await tx.query.commentVotes.findFirst({
      where: and(eq(commentVotes.commentId, commentId), eq(commentVotes.userId, user.id)),
    })

    // Resolve the final value: pressing the same arrow toggles it off.
    const current = existing?.value ?? 0
    const next: -1 | 0 | 1 = intent === current ? 0 : intent

    if (next === 0) {
      if (existing) {
        await tx.delete(commentVotes).where(eq(commentVotes.id, existing.id))
      }
    }
    else if (existing) {
      await tx
        .update(commentVotes)
        .set({ value: next, updatedAt: new Date() })
        .where(eq(commentVotes.id, existing.id))
    }
    else {
      await tx.insert(commentVotes).values({ commentId, userId: user.id, value: next })
    }

    await syncVoteCounters(tx, commentId)

    const fresh = firstOrThrow(
      await tx
        .select({ upvotes: comments.upvotes, downvotes: comments.downvotes, score: comments.score })
        .from(comments)
        .where(eq(comments.id, commentId)),
      'Failed to read vote counters',
    )

    return {
      commentId,
      upvotes: fresh.upvotes,
      downvotes: fresh.downvotes,
      score: fresh.score,
      userValue: next,
    }
  })
}

// ---------------------------------------------------------------------------
// Flag / report
// ---------------------------------------------------------------------------

/**
 * Report a comment for admin review. One report per user per comment: a repeat
 * report is a no-op success (idempotent), enforced by the unique index. Admins
 * read the open reports from the moderation queue.
 */
export async function flagComment(
  event: H3Event,
  commentId: string,
  reason?: string,
): Promise<{ success: true }> {
  const user = await requireCompleteUser(event, 'user')
  await findCommentOrThrow(commentId)

  await db
    .insert(commentFlags)
    .values({ commentId, reporterId: user.id, reason: reason?.trim() || null })
    .onConflictDoNothing({ target: [commentFlags.reporterId, commentFlags.commentId] })

  return { success: true }
}

// ---------------------------------------------------------------------------
// List (sorted + paginated)
// ---------------------------------------------------------------------------

/**
 * The sort contract lives in `shared/types/comment.ts` so the server and the
 * client can never drift. Re-declaring `CommentSort` here made Nuxt report a
 * duplicated auto-import, so we import it and only alias the order type under
 * the shorter name this module already used.
 */
export type SortOrder = CommentSortOrder

/**
 * Controversial score expression, computed over the FULL SUBTREE of a comment
 * (the comment itself plus every descendant reply at any depth), not just the
 * comment's own votes.
 *
 * Intuition: a controversial comment is one that sparked a big, divided
 * CONVERSATION. So we sum upvotes/downvotes across the whole thread under the
 * comment, then reward BOTH high total volume AND a near-even up/down split:
 *
 *   (sumUp + sumDown) * (least(sumUp, sumDown) / greatest(sumUp, sumDown, 1))
 *
 * The volume term makes magnitude dominate: a 1000/990 thread scores far higher
 * than a 10/9 thread even though both are ~50/50. The balance ratio approaches
 * 1 for an even split and shrinks toward 0 for a lopsided one, so a heavily
 * one-sided thread (e.g. only upvotes) scores low regardless of size.
 * `greatest(..., 1)` avoids division by zero when there are no votes.
 *
 * Subtree membership uses the materialized path: a root with id X has path X,
 * and every descendant has a path starting with "X/". `subtree.path = X OR
 * subtree.path LIKE X || '/%'` therefore selects the whole conversation with a
 * single indexed prefix scan (no recursive CTE).
 */
function controversialExpr(): SQL<number> {
  // Keep this expression on the outer comment row. A correlated aggregate over
  // the same table is not emitted reliably by Drizzle's relational findMany
  // query and caused this endpoint to fail with a database error.
  //
  // Volume rewards active comments; the balance ratio rewards a divided vote.
  // greatest(..., 1) keeps comments without votes at a safe score of zero.
  //
  // Every operand is cast to double precision explicitly: CockroachDB (unlike
  // Postgres) has no implicit float / int division operator, so leaving the
  // greatest(...) denominator as an integer fails with "unsupported binary
  // operator: <float> / <int>" and 500s the list endpoint.
  return sql<number>`
    (${comments.upvotes} + ${comments.downvotes})::double precision
    * least(${comments.upvotes}, ${comments.downvotes})::double precision
    / greatest(${comments.upvotes}, ${comments.downvotes}, 1)::double precision
  `
}

/**
 * List the ROOT comments of an article, sorted and keyset-paginated for the
 * load-more button. Replies are loaded separately (collapse/expand, focus
 * view), so this returns only `parentId IS NULL` comments.
 *
 * Pagination is keyset on createdAt (cursor = the createdAt of the last root
 * seen). UUID ids are not chronological, so we can no longer page on id; the
 * createdAt timestamp gives a stable "continue from here" point. createdAt is a
 * tiebreaker for the score-based sorts too.
 */
export async function listComments(query: {
  articleSlug: string
  sort: CommentSort
  order: SortOrder
  limit: number
  cursor?: string
}): Promise<{ comments: CommentRow[], nextCursor: string | null }> {
  // The API speaks slugs; resolve to the internal article id once, up front.
  const article = await db.query.articles.findFirst({
    where: eq(articles.slug, query.articleSlug),
    columns: { id: true },
  })
  if (!article) throw notFound('Article not found.')

  const dir = query.order === 'asc' ? asc : desc
  const orderBy
    = query.sort === 'top'
      ? [dir(comments.score), desc(comments.createdAt)]
      : query.sort === 'controversial'
        ? [dir(controversialExpr()), desc(comments.createdAt)]
        : [dir(comments.createdAt), desc(comments.createdAt)]

  const where = [eq(comments.articleId, article.id), sql`${comments.parentId} is null`]
  // Keyset: continue strictly past the cursor's createdAt, in the sort
  // direction (older for desc, newer for asc).
  if (query.cursor != null) {
    const cursorDate = new Date(query.cursor)
    where.push(query.order === 'asc'
      ? gt(comments.createdAt, cursorDate)
      : lt(comments.createdAt, cursorDate))
  }

  // Fetch one extra row to know whether another page exists.
  const rows = await db.query.comments.findMany({
    where: and(...where),
    orderBy,
    limit: query.limit + 1,
  })

  const hasMore = rows.length > query.limit
  const page = hasMore ? rows.slice(0, query.limit) : rows
  const nextCursor = hasMore
    ? (page[page.length - 1]?.createdAt.toISOString() ?? null)
    : null

  return { comments: page, nextCursor }
}

/**
 * Fetch every descendant (replies at any depth) of the given root comments in a
 * single query, using the materialized path prefix. A root with id "a" has
 * path "a"; all of its descendants have a path starting with "a/", so a prefix
 * match returns the whole subtree without a recursive query.
 *
 * Returns a flat list ordered oldest-first; the client assembles the tree from
 * parentId. Returns [] when there are no roots.
 */
export async function listDescendants(rootIds: string[]): Promise<CommentRow[]> {
  if (rootIds.length === 0) return []

  // Build an OR of path-prefix matches, one per root: path LIKE 'a/%'.
  const prefixMatches = rootIds.map(rid => sql`${comments.path} like ${`${rid}/%`}`)
  const anyPrefix = sql.join(prefixMatches, sql` or `)

  return db.query.comments.findMany({
    where: sql`(${anyPrefix})`,
    orderBy: [asc(comments.createdAt), asc(comments.id)],
  })
}

// ---------------------------------------------------------------------------
// Serialization & viewer votes
// ---------------------------------------------------------------------------

export interface SerializedComment {
  id: string
  articleId: number
  parentId: string | null
  depth: number
  /** Body, or the placeholder when the comment is deleted. Always plain text. */
  body: string
  isDeleted: boolean
  upvotes: number
  downvotes: number
  score: number
  editedAt: string | null
  createdAt: string
  author: { id: number, username: string, displayName: string | null } | null
}

type CommentWithAuthor = CommentRow & {
  author?: { id: number, username: string, displayName: string | null } | null
}

/**
 * Map a comment row to the safe public shape sent to clients and broadcast over
 * the websocket. Deleted comments expose the placeholder instead of their body
 * (and never their author), keeping the thread node without leaking content.
 */
export function serializeComment(row: CommentWithAuthor): SerializedComment {
  const isDeleted = row.status === 'deleted'
  return {
    id: row.id,
    articleId: row.articleId,
    parentId: row.parentId,
    depth: row.depth,
    body: isDeleted ? DELETED_PLACEHOLDER : row.body,
    isDeleted,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    score: row.score,
    editedAt: row.editedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    author: isDeleted ? null : (row.author ?? null),
  }
}

/**
 * For a set of comment ids, return how the given viewer voted on each
 * (commentId -> 1 | -1). Comments the viewer has not voted on are absent.
 * Guests (no userId) get an empty map. Never exposes other users' votes.
 */
export async function getViewerVotes(
  userId: number | null | undefined,
  commentIds: string[],
): Promise<Record<string, -1 | 1>> {
  if (!userId || commentIds.length === 0) return {}

  const rows = await db.query.commentVotes.findMany({
    where: and(eq(commentVotes.userId, userId), inArray(commentVotes.commentId, commentIds)),
    columns: { commentId: true, value: true },
  })

  const map: Record<string, -1 | 1> = {}
  for (const row of rows) map[row.commentId] = row.value as -1 | 1
  return map
}

// ---------------------------------------------------------------------------
// Admin moderation (flags)
// ---------------------------------------------------------------------------

export interface FlaggedComment {
  commentId: string
  body: string
  isDeleted: boolean
  articleId: number
  author: { id: number, username: string, displayName: string | null } | null
  reportCount: number
  reasons: string[]
  firstReportedAt: string
}

/**
 * The admin moderation queue: comments with at least one OPEN (unresolved)
 * report, newest report first. Reasons are aggregated so the admin sees why a
 * comment was flagged without N rows per comment.
 */
export async function listFlaggedComments(): Promise<FlaggedComment[]> {
  const openFlags = await db.query.commentFlags.findMany({
    where: sql`${commentFlags.resolvedAt} is null`,
    with: {
      comment: {
        with: { author: { columns: { id: true, username: true, displayName: true } } },
      },
    },
  })

  // Group the flat flag rows by the comment they target.
  const grouped = new Map<string, FlaggedComment>()
  for (const flag of openFlags) {
    // Drizzle cannot infer the nested `with` above (the self-referencing
    // comments table makes the inferred relation collapse to `{}`), so name the
    // exact shape requested by the query instead of reading from an empty type.
    const comment = flag.comment as CommentRow & { author: FlaggedComment['author'] }
    if (!comment) continue

    let entry = grouped.get(comment.id)
    if (!entry) {
      entry = {
        commentId: comment.id,
        body: comment.status === 'deleted' ? DELETED_PLACEHOLDER : comment.body,
        isDeleted: comment.status === 'deleted',
        articleId: comment.articleId,
        author: comment.author ?? null,
        reportCount: 0,
        reasons: [],
        firstReportedAt: flag.createdAt.toISOString(),
      }
      grouped.set(comment.id, entry)
    }
    entry.reportCount += 1
    if (flag.reason) entry.reasons.push(flag.reason)
    if (flag.createdAt.toISOString() < entry.firstReportedAt) {
      entry.firstReportedAt = flag.createdAt.toISOString()
    }
  }

  return [...grouped.values()].sort((a, b) => b.reportCount - a.reportCount)
}

/** Mark every open report on a comment as resolved (admin handled it). */
export async function resolveCommentFlags(commentId: string): Promise<{ resolved: number }> {
  const result = await db
    .update(commentFlags)
    .set({ resolvedAt: new Date() })
    .where(and(eq(commentFlags.commentId, commentId), sql`${commentFlags.resolvedAt} is null`))
    .returning({ id: commentFlags.id })

  return { resolved: result.length }
}

// ---------------------------------------------------------------------------
// Focus / deep-link fetch
// ---------------------------------------------------------------------------

export interface CommentFocus {
  /** The focused comment. */
  comment: CommentRow
  /** Ancestors from root down to the focused comment's parent (re-root breadcrumb). */
  ancestors: CommentRow[]
  /** The whole subtree under the focused comment (descendants at any depth). */
  children: CommentRow[]
}

/**
 * Load a single comment plus its ancestors and its WHOLE subtree, for the
 * `?comment=<uuid>` deep link and the re-rooting focus view. Ancestors are read
 * straight from the materialized path (no recursive query), ordered root-first
 * so the client can render the "show parent" breadcrumb.
 *
 * `children` returns every descendant at any depth (not just direct replies),
 * so re-rooting onto a deep comment shows the full conversation under it. Reuse
 * the path-prefix query (`listDescendants`): a comment with id X has path X and
 * every descendant a path starting with "X/".
 */
export async function getCommentFocus(commentId: string): Promise<CommentFocus> {
  const comment = await findCommentOrThrow(commentId)

  // Path is "rootId/.../selfId"; ancestors are every id except the last (self).
  const ancestorIds = parseAncestorIds(comment.path, comment.id)

  const ancestors = ancestorIds.length
    ? (await db.query.comments.findMany({ where: inArray(comments.id, ancestorIds) }))
        // Re-order to match the path (root first), since SQL order is not guaranteed.
        .sort((a, b) => ancestorIds.indexOf(a.id) - ancestorIds.indexOf(b.id))
    : []

  // The entire subtree under the focused comment, at any depth.
  const children = await listDescendants([comment.id])

  return { comment, ancestors, children }
}
