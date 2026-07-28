import type { SerializedNotification } from '~~/server/utils/notifications'

/**
 * Realtime broadcast contract for the per-user notification websocket channel.
 *
 * Near-identical to `commentBroadcast.ts`, with one difference: the topic is
 * per USER (`notifications:user:<id>`) instead of per article. Writes never
 * happen over the socket; the REST/comment paths create notifications and then
 * call `publishNotificationEvent` to fan a server-trusted event to that user's
 * connected tabs. So the socket is a one-way push and carries no authorization.
 */

/** Topic (room) for one user's notification stream. */
export function userTopic(userId: number): string {
  return `notifications:user:${userId}`
}

/** A new notification was created for the user. */
export interface NotificationCreatedEvent {
  type: 'created'
  notification: SerializedNotification
}

export type NotificationEvent = NotificationCreatedEvent

/**
 * Registry of connected peers per user topic. Mirrors the comment registry:
 * events originate outside the socket (in the emitter), so the websocket
 * handler registers each peer on subscribe and the emitter fans out through
 * this registry. Kept on globalThis so the same instance is shared across the
 * Nitro module graph in dev (HMR) and prod.
 */
type Peer = { send: (data: string) => void }

const registry: Map<string, Set<Peer>> = ((globalThis as Record<string, unknown>).__notificationPeers as Map<string, Set<Peer>>)
  ?? ((globalThis as Record<string, unknown>).__notificationPeers = new Map())

/** Add a peer to a user's room (called by the websocket handler on subscribe). */
export function addNotificationPeer(topic: string, peer: Peer): void {
  let room = registry.get(topic)
  if (!room) registry.set(topic, (room = new Set()))
  room.add(peer)
}

/** Remove a peer from every room (called on disconnect). */
export function removeNotificationPeer(peer: Peer): void {
  // `room` is an in-memory Set, not a Drizzle table; this is Set.prototype.delete.

  for (const room of registry.values()) room.delete(peer)
}

/**
 * Push an event to every tab the user has open. Safe to call when the user has
 * no connected tabs (no-op). Never throws into the caller: a broken socket must
 * not fail the notification insert that triggered it.
 */
export function publishNotificationEvent(userId: number, event: NotificationEvent): void {
  const room = registry.get(userTopic(userId))
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
