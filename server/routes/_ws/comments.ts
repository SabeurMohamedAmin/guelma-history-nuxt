import { addCommentPeer, articleTopic, removeCommentPeer } from '~~/server/utils/commentBroadcast'

/**
 * Native Nitro WebSocket channel for realtime comments.
 *
 * Connection URL: ws(s)://<host>/_ws/comments
 *
 * Protocol (client -> server), JSON text frames:
 *   { "type": "subscribe",   "articleSlug": "hello-world" }  // join a room
 *   { "type": "unsubscribe", "articleSlug": "hello-world" }  // leave it
 *
 * The socket is READ-ONLY for clients: it only manages room membership. All
 * mutations go through the authenticated REST API, which then fans events out
 * to the room via publishCommentEvent. This keeps every authorization and XSS
 * check on one path and means a malicious frame here can do nothing but
 * (un)subscribe itself.
 */
export default defineWebSocketHandler({
  open(peer) {
    // Ack so the client knows the socket is live.
    peer.send(JSON.stringify({ type: 'ready' }))
  },

  message(peer, message) {
    let data: { type?: string, articleSlug?: unknown }
    try {
      data = JSON.parse(message.text())
    }
    catch {
      return // ignore non-JSON frames
    }

    // Rooms are keyed by the article's PUBLIC slug — the same value the REST
    // handlers publish with (e.g. "massacres-8-mai-1945-guelma").
    const articleSlug = String(data.articleSlug ?? '').trim()
    if (!/^[\w-]+$/.test(articleSlug)) return
    const topic = articleTopic(articleSlug)

    if (data.type === 'subscribe') {
      peer.subscribe(topic) // crossws-native room (for peer-side delivery)
      addCommentPeer(topic, peer) // registry used by REST handlers to publish
    }
    else if (data.type === 'unsubscribe') {
      peer.unsubscribe(topic)
    }
  },

  close(peer) {
    removeCommentPeer(peer)
  },

  error(peer) {
    removeCommentPeer(peer)
  },
})
