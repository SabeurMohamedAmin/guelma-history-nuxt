/**
 * Shared comment types used by BOTH the server (serialization, websocket) and
 * the client (composable, components), so the realtime payload shape can never
 * drift between the two sides.
 *
 * Bodies are always PLAIN TEXT here — never HTML. The client renders them with
 * text interpolation (`{{ body }}`) and `dir="auto"`, never `v-html`.
 */

export type CommentSort = 'new' | 'top' | 'controversial'
export type CommentSortOrder = 'asc' | 'desc'

/** The author display fields exposed on a comment (never the full user row). */
export interface CommentAuthor {
  id: string
  username: string
  displayName: string | null
}

/** A comment as sent to clients and broadcast over the websocket. */
export interface CommentNode {
  /** UUID string (e.g. "3f0c…"). Not a numeric counter. */
  id: string
  /** Article UUID. */
  articleId: string
  /** Parent comment UUID, or null for a top-level comment. */
  parentId: string | null
  depth: number
  /** Plain text, or the "[deleted]" placeholder when isDeleted is true. */
  body: string
  isDeleted: boolean
  upvotes: number
  downvotes: number
  score: number
  editedAt: string | null
  createdAt: string
  author: CommentAuthor | null
  /** The current viewer's vote on this comment: 1, -1, or 0 (none). */
  viewerVote: -1 | 0 | 1
}

/** Fresh vote tallies for one comment (no per-user data). */
export interface CommentVoteTally {
  commentId: string
  upvotes: number
  downvotes: number
  score: number
}

/** Realtime events pushed from the server over the websocket. */
export type CommentEvent
  = | { type: 'created', comment: CommentNode }
    | { type: 'updated', comment: CommentNode }
    | { type: 'deleted', comment: CommentNode }
    | { type: 'voted', vote: CommentVoteTally }
