import type { SerializedComment, VoteResult } from '~~/server/utils/comments'

/**
 * Realtime broadcast contract for the comment websocket channel.
 *
 * Writes never happen over the socket: clients mutate through the authenticated
 * REST API, and the handlers call `publishCommentEvent` AFTER a successful,
 * already-sanitized write. The socket is therefore a one-way fan-out of
 * server-trusted events, which keeps all authorization and XSS handling on the
 * single REST path.
 */

/**
 * Topic (room) for one article's comment stream, keyed by the article's PUBLIC
 * slug — the same stable identifier the client already has from the URL.
 */
export function articleTopic(articleSlug: string): string {
  return `comments:article:${articleSlug}`
}

/** A new comment or reply was created. */
export interface CommentCreatedEvent {
  type: 'created'
  comment: SerializedComment
}

/** An existing comment body was edited (carries the fresh editedAt). */
export interface CommentUpdatedEvent {
  type: 'updated'
  comment: SerializedComment
}

/** A comment was soft-deleted (body replaced by the placeholder). */
export interface CommentDeletedEvent {
  type: 'deleted'
  comment: SerializedComment
}

/** A comment's vote tallies changed. No per-user data is broadcast. */
export interface CommentVotedEvent {
  type: 'voted'
  vote: Pick<VoteResult, 'commentId' | 'upvotes' | 'downvotes' | 'score'>
}

/**
 * The server-side broadcast union. Deliberately NOT called `CommentEvent`: the
 * client-facing union in `shared/types/comment.ts` already owns that name, and
 * both files are auto-imported, so a shared name means one of them is dropped.
 */
export type CommentBroadcastEvent
  = | CommentCreatedEvent
    | CommentUpdatedEvent
    | CommentDeletedEvent
    | CommentVotedEvent

/**
 * Registry of connected peers per article topic.
 *
 * crossws lets a peer publish to a topic it is subscribed to, but our events
 * originate in REST handlers (no peer in scope). So the websocket handler
 * registers each peer here on subscribe and removes it on close, and the REST
 * handlers fan out through this registry. Kept on globalThis so the same
 * instance is shared across the Nitro module graph in dev (HMR) and prod.
 */
type Peer = { send: (data: string) => void }

const registry: Map<string, Set<Peer>> = ((globalThis as Record<string, unknown>).__commentPeers as Map<string, Set<Peer>>)
  ?? ((globalThis as Record<string, unknown>).__commentPeers = new Map())

/** Add a peer to a topic's room (called by the websocket handler on subscribe). */
export function addCommentPeer(topic: string, peer: Peer): void {
  let room = registry.get(topic)
  if (!room) registry.set(topic, (room = new Set()))
  room.add(peer)
}

/** Remove a peer from every room (called on disconnect). */
export function removeCommentPeer(peer: Peer): void {
  // `room` is an in-memory Set, not a Drizzle table; this is Set.prototype.delete.

  for (const room of registry.values()) room.delete(peer)
}

/**
 * Fan an event out to every peer subscribed to the article's topic. Safe to
 * call when there are no subscribers (no-op). Never throws into the caller: a
 * broken socket must not fail the REST write that triggered it.
 */
export function publishCommentEvent(articleSlug: string, event: CommentBroadcastEvent): void {
  const room = registry.get(articleTopic(articleSlug))
  if (!room || room.size === 0) return

  const payload = JSON.stringify(event)
  for (const peer of room) {
    try {
      peer.send(payload)
    }
    catch {
      // Drop unsendable peers; close handling will clean them up.
      // `room` is an in-memory Set, not a Drizzle table (Set.prototype.delete).

      room.delete(peer)
    }
  }
}
