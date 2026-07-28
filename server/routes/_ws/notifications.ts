import { addNotificationPeer, removeNotificationPeer, userTopic } from '~~/server/utils/notificationBroadcast'

/**
 * Native Nitro WebSocket channel for realtime per-user notifications.
 *
 * Connection URL: ws(s)://<host>/_ws/notifications
 *
 * Protocol (client -> server), JSON text frames:
 *   { "type": "subscribe" }   // join YOUR notification room
 *
 * Unlike the comments channel, the client does NOT choose which room to join.
 * The room is derived from the authenticated SESSION, so a peer can only ever
 * receive its own notifications: a malicious frame cannot subscribe to another
 * user's stream. Unauthenticated peers are simply never added to a room.
 *
 * The socket is one-way: the server only ever pushes 'created' events created
 * by the REST/comment write path via publishNotificationEvent.
 */
export default defineWebSocketHandler({
  open(peer) {
    // Ack so the client knows the socket is live.
    peer.send(JSON.stringify({ type: 'ready' }))
  },

  async message(peer, message) {
    let data: { type?: string }
    try {
      data = JSON.parse(message.text())
    }
    catch {
      return // ignore non-JSON frames
    }

    if (data.type !== 'subscribe') return

    // Resolve the user from the session cookie on the upgrade request. We never
    // trust a client-supplied id, so a peer can only join its own room.
    const session = await getUserSession(peer).catch(() => null)
    const userId = session?.user?.id
    if (!userId) return

    const topic = userTopic(userId)
    peer.subscribe(topic) // crossws-native room (peer-side delivery)
    addNotificationPeer(topic, peer) // registry used by the emitter to publish
  },

  close(peer) {
    removeNotificationPeer(peer)
  },

  error(peer) {
    removeNotificationPeer(peer)
  },
})
