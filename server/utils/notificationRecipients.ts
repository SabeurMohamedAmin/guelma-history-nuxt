/**
 * Pure recipient resolution for comment notifications.
 *
 * This file has NO database access on purpose: given the few facts about a
 * comment event, it returns the final list of user ids that should be
 * notified. Keeping it pure makes the notification rules (the most important
 * part of the feature) easy to read and easy to unit-test, exactly like the
 * `buildCommentPath` threading helper.
 *
 * The DB-backed concerns (looking up who owns the article, and dropping users
 * who muted the thread) live in the emitter in `server/utils/notifications.ts`.
 * This function only owns the rules R1-R4.
 */

/** The facts the rules need about one comment/reply event. */
export interface CommentNotificationContext {
  /** The user who wrote the comment/reply (never notified about their own action). */
  actorId: number
  /** The user who owns the article (articles.createdByUserId), the discussion home. */
  articleOwnerId: number
  /**
   * The author of the comment being replied to, or null for a top-level
   * comment (which replies to nobody).
   */
  parentCommentAuthorId: number | null
}

/**
 * Resolve the final recipients for a comment/reply event.
 *
 * Rules:
 *   R1 - Comment on an article  -> notify the article owner.
 *   R2 - Reply to a comment     -> notify the parent comment owner.
 *   R3 - Reply anywhere         -> notify the article owner (discussion changed).
 *   R4 - Never notify the actor about their own action, and de-duplicate so the
 *        same user is notified at most once (R3 can overlap R2 when the article
 *        owner is also the parent comment owner).
 *
 * Returns user ids with no particular ordering guarantee.
 */
export function resolveCommentNotificationRecipients(
  context: CommentNotificationContext,
): number[] {
  const { actorId, articleOwnerId, parentCommentAuthorId } = context

  // Candidates from the rules. The article owner is always a candidate (R1/R3).
  // The parent comment owner is a candidate only when this was a reply (R2).
  const candidates = [articleOwnerId]
  if (parentCommentAuthorId !== null) {
    candidates.push(parentCommentAuthorId)
  }

  // R4: drop the actor (no self-notify), then de-duplicate with a Set.
  const recipients = candidates.filter(userId => userId !== actorId)
  return [...new Set(recipients)]
}
