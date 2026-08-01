/**
 * Shared notification types used by BOTH the server (serialization) and the
 * client (store, components), so the payload shape can never drift between the
 * two sides. Mirrors `shared/types/comment.ts`.
 */

/**
 * What happened, so the client can pick the right message:
 *   - article_comment         : someone commented on your article.
 *   - comment_reply           : someone replied to your comment.
 *   - article_thread_activity : a reply changed the discussion on your article.
 */
export type NotificationType
  = | 'article_comment'
    | 'comment_reply'
    | 'article_thread_activity'

/** The actor display fields exposed on a notification (never the full user row). */
export interface NotificationActor {
  id: string
  username: string
  displayName: string | null
}

/** A notification as sent to the client. */
export interface NotificationItem {
  /** UUID string. */
  id: string
  type: NotificationType
  /** Unread = false. Derived server-side from `readAt IS NULL`. */
  isRead: boolean
  /** Deep-link target: the article the discussion belongs to. */
  articleId: string
  /**
   * The article slug, used to build the deep link (/articles/<slug>). Routes
   * use the slug, not the numeric id. Null only if it was not loaded.
   */
  articleSlug: string | null
  /** The comment that triggered it, for the `?comment=<uuid>` deep link. */
  commentId: string
  createdAt: string
  actor: NotificationActor | null
}

/** The scope of a notification mute. See the notification_mutes schema. */
export type MuteScope = 'all' | 'article' | 'comment'

/** A mute as listed for the current user. */
export interface NotificationMute {
  id: string
  scope: MuteScope
  articleId: string | null
  commentId: string | null
  createdAt: string
}
