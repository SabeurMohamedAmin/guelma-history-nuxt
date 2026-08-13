import { z } from 'zod'
import { sanitizeCommentBody } from '~~/server/utils/sanitizeComment'
import { articleSlugSchema } from './slug'
import { databaseUuidSchema } from '~~/shared/database-uuid'

/**
 * Validation rules for the realtime threaded comment system. Single source of
 * truth for every read/write contract so the API handlers stay thin and the
 * rules can never drift between routes (or between server and the websocket).
 *
 * Articles are referenced by their PUBLIC SLUG (e.g. "hello-world"), never by
 * the internal database id: slugs are stable and readable, and the server
 * resolves slug -> id internally.
 */

/** A comment id: a UUID string (comments use uuid primary keys, not counters). */
const commentId = databaseUuidSchema

/** Maximum length of a comment body, in characters. Product rule. */
export const COMMENT_MAX_LENGTH = 1200

/**
 * A comment body: sanitized first (strip invisible/control chars, normalize
 * newlines), THEN validated. Order matters: sanitizing can turn a string of
 * only zero-width characters into '', which the non-empty rule then rejects.
 */
const body = z
  .string()
  .transform(sanitizeCommentBody)
  .pipe(
    z
      .string()
      .min(1, 'Comment cannot be empty')
      .max(COMMENT_MAX_LENGTH, `Comment must be at most ${COMMENT_MAX_LENGTH} characters`),
  )

/** Create a comment. `parentId` null/absent = a new top-level comment. */
export const createCommentSchema = z.object({
  articleSlug: articleSlugSchema,
  parentId: commentId.nullable().optional(),
  body,
}).strict()
export type CreateCommentPayload = z.infer<typeof createCommentSchema>

/** Edit a comment body. The id comes from the route, not the body. */
export const editCommentSchema = z.object({
  body,
}).strict()
export type EditCommentPayload = z.infer<typeof editCommentSchema>

/**
 * Cast a vote. `value` is the user's intent on an arrow:
 * +1 upvote, -1 downvote, 0 clear. The toggle (pressing the same arrow twice)
 * is resolved server-side against the existing vote.
 */
export const voteCommentSchema = z.object({
  value: z.union([z.literal(1), z.literal(0), z.literal(-1)]),
}).strict()
export type VoteCommentPayload = z.infer<typeof voteCommentSchema>

/** Flag/report a comment with an optional short reason. */
export const flagCommentSchema = z.object({
  reason: z.string().trim().max(500, 'Reason is too long').optional().or(z.literal('')),
}).strict()
export type FlagCommentPayload = z.infer<typeof flagCommentSchema>

/** Sort modes for a comment list. */
export const COMMENT_SORTS = ['new', 'top', 'controversial'] as const
export type CommentSort = (typeof COMMENT_SORTS)[number]

/**
 * Query for listing a thread page (load-more pagination).
 * - sort/order: New/Top/Controversial, each ascending or descending.
 * - limit: page size for the load-more button.
 * - cursor: opaque id of the last loaded root comment for keyset pagination.
 */
export const listCommentsSchema = z.object({
  articleSlug: articleSlugSchema,
  sort: z.enum(COMMENT_SORTS).default('new'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  // Keyset cursor: the createdAt ISO timestamp of the last root seen (uuids are
  // not time-ordered, so we page on createdAt instead of id).
  cursor: z.string().datetime().optional(),
}).strict()

/** A comment id from a route param. Exported so handlers validate consistently. */
export const commentIdSchema = commentId
export type ListCommentsQuery = z.infer<typeof listCommentsSchema>
