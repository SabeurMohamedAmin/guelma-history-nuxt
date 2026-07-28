import { z } from 'zod'

/**
 * Validation rules for the notifications feature. Single source of truth for
 * every read/write contract so the API handlers stay thin and the rules can
 * never drift between routes.
 */

/** A numeric id for non-comment entities (e.g. articleId, mute id). */
const numericId = z.coerce.number().int().positive()

/** A comment id: a UUID string (comments use uuid primary keys, not counters). */
const commentId = z.string().uuid()

/**
 * Query for listing the current user's notifications (load-more pagination).
 * - limit: page size for the load-more button.
 * - cursor: keyset pair of the last row seen: "<createdAtISO>|<id>".
 *   The id breaks ties when multiple notifications share the same timestamp.
 */
export const listNotificationsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().optional(),
})
export type ListNotificationsQuery = z.infer<typeof listNotificationsSchema>

/** A notification id from a route param (mark-as-read). */
export const notificationIdSchema = z.string().uuid()

/** The mute scopes a user can choose. See the notification_mutes schema. */
export const MUTE_SCOPES = ['all', 'article', 'comment'] as const
export type MuteScope = (typeof MUTE_SCOPES)[number]

/**
 * Create a mute. The required target depends on the scope:
 *   - 'all'     : no target (mutes everything).
 *   - 'article' : `articleId` is required.
 *   - 'comment' : `commentId` is required.
 * `superRefine` enforces that the right target is present (and only that one),
 * so a handler can trust the payload without re-checking.
 */
export const createMuteSchema = z
  .object({
    scope: z.enum(MUTE_SCOPES),
    articleId: numericId.optional(),
    commentId: commentId.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'article' && value.articleId === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['articleId'], message: 'articleId is required to mute an article' })
    }
    if (value.scope === 'comment' && value.commentId === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['commentId'], message: 'commentId is required to mute a comment' })
    }
    if (value.scope === 'all' && (value.articleId !== undefined || value.commentId !== undefined)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scope'], message: 'A global mute cannot target an article or comment' })
    }
  })
export type CreateMutePayload = z.infer<typeof createMuteSchema>

/** A mute id from a route param (unmute). */
export const muteIdSchema = numericId
