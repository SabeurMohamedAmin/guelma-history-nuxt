/**
 * Pure mute-matching for comment notifications (rule R5).
 *
 * Given the mutes a set of recipients hold, decide who should still be
 * notified about a comment on a given article/thread. Kept free of any database
 * access so the rule is easy to read and unit-test, like the recipient
 * resolver. The emitter in `notifications.ts` reads the mute rows from the DB
 * and hands them here.
 */

/** The fields of a mute row this rule needs. */
export interface MuteRecord {
  userId: number
  scope: 'all' | 'article' | 'comment'
  articleId: number | null
  commentId: string | null
}

/** The target of the notification being sent. */
export interface MuteTarget {
  articleId: number
  commentId: string
}

/**
 * Does this mute silence a notification for the given target?
 *   - 'all'     : silences everything,
 *   - 'article' : silences only when the article matches,
 *   - 'comment' : silences only when the comment matches.
 */
function muteSilencesTarget(mute: MuteRecord, target: MuteTarget): boolean {
  if (mute.scope === 'all') return true
  if (mute.scope === 'article') return mute.articleId === target.articleId
  if (mute.scope === 'comment') return mute.commentId === target.commentId
  return false
}

/**
 * Remove recipients who muted this target.
 *
 * `recipientIds` is the final, de-duplicated recipient set from the rules;
 * `mutes` is every mute held by those recipients (any scope). A recipient is
 * dropped if ANY of their mutes silences the target.
 */
export function filterMutedRecipients(
  recipientIds: number[],
  mutes: MuteRecord[],
  target: MuteTarget,
): number[] {
  const mutedUserIds = new Set(
    mutes.filter(mute => muteSilencesTarget(mute, target)).map(mute => mute.userId),
  )
  return recipientIds.filter(userId => !mutedUserIds.has(userId))
}
