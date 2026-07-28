import { and, desc, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm'
import { db } from '~~/server/db'
import { articles } from '~~/server/db/schema/articles'
import { comments } from '~~/server/db/schema/comments'
import { notifications } from '~~/server/db/schema/notifications'
import { notificationMutes } from '~~/server/db/schema/notification-mutes'
import { resolveCommentNotificationRecipients } from '~~/server/utils/notificationRecipients'
import { filterMutedRecipients } from '~~/server/utils/notificationMutes'
import { publishNotificationEvent } from '~~/server/utils/notificationBroadcast'
import type { CreateMutePayload } from '~~/server/validators/notification.validator'

/**
 * Domain logic for the notifications feature.
 *
 * Keeps every notification rule in one place so the comment handler stays thin
 * and notifications remain a separate domain (mirrors `server/utils/comments.ts`
 * and `server/utils/commentBroadcast.ts`). The comment handler calls a single
 * function, `emitCommentNotifications`, and owns nothing about who gets notified.
 *
 * Split of responsibilities:
 *   - The pure RULES (who is a candidate, no self-notify, de-dup) live in
 *     `notificationRecipients.ts` so they can be unit-tested without a DB.
 *   - The DB-backed CONCERNS (look up the article owner, drop muted users,
 *     insert rows, read the list) live here.
 */

type NotificationType = (typeof notifications.$inferSelect)['type']
type NotificationRow = typeof notifications.$inferSelect

// ---------------------------------------------------------------------------
// Emit (called after a comment/reply is created)
// ---------------------------------------------------------------------------

/** The minimal shape of the just-created comment the emitter needs. */
interface CreatedCommentInput {
  id: string
  articleId: number
  parentId: string | null
  authorId: number
}

/**
 * Pick the notification `type` for one recipient, so the client can show the
 * right message:
 *   - the parent comment owner sees a reply notification,
 *   - the article owner sees "new comment" for a top-level comment, or
 *     "thread activity" for a reply somewhere in their article.
 */
function notificationType(args: {
  recipientId: number
  articleOwnerId: number
  parentCommentAuthorId: number | null
  isReply: boolean
}): NotificationType {
  if (args.parentCommentAuthorId !== null && args.recipientId === args.parentCommentAuthorId) {
    return 'comment_reply'
  }
  if (args.recipientId === args.articleOwnerId) {
    return args.isReply ? 'article_thread_activity' : 'article_comment'
  }
  // Fallback (should not happen given the recipient set): treat as a reply.
  return 'comment_reply'
}

/**
 * Remove the recipients who have muted this notification, in one query.
 *
 * A recipient is dropped if they have ANY matching mute:
 *   - scope 'all'                      : they muted everything,
 *   - scope 'article' for this article : they muted this article's thread,
 *   - scope 'comment' for this comment : they muted this comment thread.
 */
async function dropMutedRecipients(
  recipientIds: number[],
  articleId: number,
  commentId: string,
): Promise<number[]> {
  if (recipientIds.length === 0) return []

  // Read every mute these recipients hold, then let the pure rule (R5) decide
  // who is silenced for this specific article/comment target.
  const mutes = await db.query.notificationMutes.findMany({
    where: inArray(notificationMutes.userId, recipientIds),
    columns: { userId: true, scope: true, articleId: true, commentId: true },
  })

  return filterMutedRecipients(recipientIds, mutes, { articleId, commentId })
}

/**
 * Emit notifications for a freshly created comment or reply.
 *
 * Flow: look up the article owner (+ the parent comment author when this is a
 * reply) -> resolve the recipients with the pure rules (R1-R4) -> drop muted
 * recipients (R5) -> bulk-insert one row per surviving recipient.
 *
 * Fire-and-forget: this NEVER throws into the caller. A notification failure
 * must not roll back or fail the user's comment write, exactly like
 * `publishCommentEvent`. The comment handler awaits it only so any insert
 * finishes within the request.
 */
export async function emitCommentNotifications(created: CreatedCommentInput): Promise<void> {
  try {
    const isReply = created.parentId !== null

    // The article owner is the real owning account (createdByUserId), NOT the
    // editorial byline (authorId), which may be shared or null.
    const article = await db.query.articles.findFirst({
      where: eq(articles.id, created.articleId),
      columns: { createdByUserId: true },
    })
    if (!article) return
    const articleOwnerId = article.createdByUserId

    // The author of the comment being replied to (only for replies).
    let parentCommentAuthorId: number | null = null
    if (created.parentId !== null) {
      const parent = await db.query.comments.findFirst({
        where: eq(comments.id, created.parentId),
        columns: { authorId: true },
      })
      parentCommentAuthorId = parent?.authorId ?? null
    }

    // R1-R4: pure rules decide the candidates, drop the actor, de-duplicate.
    const recipientIds = resolveCommentNotificationRecipients({
      actorId: created.authorId,
      articleOwnerId,
      parentCommentAuthorId,
    })

    // R5: respect each recipient's mutes.
    const finalRecipientIds = await dropMutedRecipients(recipientIds, created.articleId, created.id)
    if (finalRecipientIds.length === 0) return

    // One row per recipient, with a per-recipient type for the right message.
    const inserted = await db
      .insert(notifications)
      .values(
        finalRecipientIds.map(recipientId => ({
          recipientId,
          actorId: created.authorId,
          type: notificationType({ recipientId, articleOwnerId, parentCommentAuthorId, isReply }),
          articleId: created.articleId,
          commentId: created.id,
        })),
      )
      .returning()

    // Look up the article slug once so the realtime payload can deep-link to
    // /articles/<slug> (routes use the slug, not the numeric id).
    const articleForLink = await db.query.articles.findFirst({
      where: eq(articles.id, created.articleId),
      columns: { slug: true },
    })

    // Push each new row to that user's open tabs (if any). The actor display
    // fields are not loaded here, so the live payload has actor: null; the
    // client shows the generic "someone" label until the list is refetched.
    for (const row of inserted) {
      publishNotificationEvent(row.recipientId, {
        type: 'created',
        notification: serializeNotification({ ...row, article: articleForLink ?? null }),
      })
    }
  }
  catch (error) {
    // Swallow: a notification failure must never break the comment write.
    console.error('[notifications] emitCommentNotifications failed:', error)
  }
}

// ---------------------------------------------------------------------------
// Serialization
// ---------------------------------------------------------------------------

export interface SerializedNotification {
  id: string
  type: NotificationType
  isRead: boolean
  articleId: number
  // The article slug, used to build the deep link (/articles/<slug>). Routes use
  // the slug, not the numeric id. Null only if the article relation was not
  // loaded for this payload.
  articleSlug: string | null
  commentId: string
  createdAt: string
  actor: { id: number, username: string, displayName: string | null } | null
}

type NotificationWithRelations = NotificationRow & {
  actor?: { id: number, username: string, displayName: string | null } | null
  article?: { slug: string } | null
}

/** Map a notification row to the safe public shape sent to the client. */
export function serializeNotification(row: NotificationWithRelations): SerializedNotification {
  return {
    id: row.id,
    type: row.type,
    // Unread state is encoded as `readAt IS NULL`; expose a simple boolean.
    isRead: row.readAt !== null,
    articleId: row.articleId,
    articleSlug: row.article?.slug ?? null,
    commentId: row.commentId,
    createdAt: row.createdAt.toISOString(),
    actor: row.actor ?? null,
  }
}

// ---------------------------------------------------------------------------
// Read paths (list + unread count)
// ---------------------------------------------------------------------------

/**
 * Encode / decode the load-more cursor.
 *
 * We page on the PAIR (createdAt, id), not createdAt alone: notifications
 * inserted in the same bulk emit share an identical createdAt, so paging on the
 * timestamp by itself would skip or repeat those tied rows. The unique `id`
 * breaks the tie. The cursor is the last row's "<createdAtISO>|<id>".
 */
function decodeCursor(cursor: string): { createdAt: Date, id: string } | null {
  const sep = cursor.lastIndexOf('|')
  if (sep === -1) return null
  const createdAt = new Date(cursor.slice(0, sep))
  const id = cursor.slice(sep + 1)
  if (Number.isNaN(createdAt.getTime()) || !id) return null
  return { createdAt, id }
}

/**
 * List one user's notifications, newest first, with load-more pagination.
 *
 * Keyset paginated on (createdAt DESC, id DESC). `cursor` is the last row seen,
 * encoded as "<createdAtISO>|<id>"; we return the next page strictly "after" it
 * in that order, so each page advances and never repeats a row.
 */
export async function listNotifications(
  userId: number,
  options: { limit: number, cursor?: string },
): Promise<SerializedNotification[]> {
  // "Older than the cursor" in (createdAt DESC, id DESC) order means:
  //   createdAt < cursor.createdAt
  //   OR (createdAt = cursor.createdAt AND id < cursor.id)
  const decoded = options.cursor ? decodeCursor(options.cursor) : null
  const keysetBefore = decoded
    ? or(
        lt(notifications.createdAt, decoded.createdAt),
        and(eq(notifications.createdAt, decoded.createdAt), lt(notifications.id, decoded.id)),
      )
    : undefined

  const rows = await db.query.notifications.findMany({
    where: and(
      eq(notifications.recipientId, userId),
      keysetBefore,
    ),
    orderBy: [desc(notifications.createdAt), desc(notifications.id)],
    limit: options.limit,
    with: {
      actor: { columns: { id: true, username: true, displayName: true } },
      // The slug builds the deep link (/articles/<slug>), since routes use the
      // slug rather than the numeric id.
      article: { columns: { slug: true } },
    },
  })

  return rows.map(serializeNotification)
}

/** Count one user's unread notifications, for the bell badge. */
export async function countUnread(userId: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)))

  return Number(row?.count ?? 0)
}

/**
 * Mark one notification as read. Scoped to the owner so a user can only mark
 * their own. Idempotent: re-marking keeps the original read time.
 */
export async function markRead(userId: number, notificationId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(
      eq(notifications.id, notificationId),
      eq(notifications.recipientId, userId),
      isNull(notifications.readAt),
    ))
}

/** Mark every unread notification for a user as read. */
export async function markAllRead(userId: number): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)))
}

/** Delete one notification, scoped to the owner. */
export async function deleteNotification(userId: number, notificationId: string): Promise<void> {
  await db
    .delete(notifications)
    .where(and(
      eq(notifications.id, notificationId),
      eq(notifications.recipientId, userId),
    ))
}

// ---------------------------------------------------------------------------
// Mutes
// ---------------------------------------------------------------------------

export interface SerializedMute {
  id: number
  scope: CreateMutePayload['scope']
  articleId: number | null
  commentId: string | null
  createdAt: string
}

/** List one user's mutes (so the UI can show what is muted). */
export async function listMutes(userId: number): Promise<SerializedMute[]> {
  const rows = await db.query.notificationMutes.findMany({
    where: eq(notificationMutes.userId, userId),
    orderBy: [desc(notificationMutes.createdAt)],
  })

  return rows.map(row => ({
    id: row.id,
    scope: row.scope,
    articleId: row.articleId,
    commentId: row.commentId,
    createdAt: row.createdAt.toISOString(),
  }))
}

/**
 * Mute a target for a user. The payload is already validated (the right target
 * is present for the scope). `onConflictDoNothing` makes muting the same thing
 * twice a no-op instead of an error, matching the unique index on the table.
 */
export async function muteTarget(userId: number, payload: CreateMutePayload): Promise<void> {
  await db
    .insert(notificationMutes)
    .values({
      userId,
      scope: payload.scope,
      articleId: payload.scope === 'article' ? payload.articleId ?? null : null,
      commentId: payload.scope === 'comment' ? payload.commentId ?? null : null,
    })
    .onConflictDoNothing()
}

/** Remove a mute by id, scoped to the owner so a user can only unmute their own. */
export async function unmuteTarget(userId: number, muteId: number): Promise<void> {
  await db
    .delete(notificationMutes)
    .where(and(eq(notificationMutes.id, muteId), eq(notificationMutes.userId, userId)))
}
