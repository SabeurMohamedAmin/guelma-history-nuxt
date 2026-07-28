/**
 * Small WebSocket client shared by the realtime features (comments,
 * notifications).
 *
 * Why a wrapper instead of `new WebSocket(...)` in each component:
 * - a dropped socket is reconnected automatically, with a growing delay so a
 *   server restart does not trigger a reconnect storm,
 * - a proxy that refuses the upgrade (a very common production setup) no longer
 *   floods the console: we stop after a few attempts and the feature simply
 *   degrades to the REST API,
 * - the ws/wss choice and the host are resolved in one place.
 */

export interface RealtimeSocketOptions {
  /** Path of the Nitro websocket route, e.g. '/_ws/comments'. */
  path: string
  /** Called once the socket is open: send your subscribe frame here. */
  onOpen?: (socket: WebSocket) => void
  /** Called for every parsed JSON frame. Malformed frames are dropped. */
  onMessage: (data: unknown) => void
}

// Reconnect delays in milliseconds. After the last one we give up, because a
// failure that persists this long is a configuration issue, not a blip.
const RECONNECT_DELAYS_MS = [1_000, 3_000, 10_000]

export function useRealtimeSocket(options: RealtimeSocketOptions) {
  const isConnected = ref(false)

  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0
  // Set when the component unmounts, so a pending retry does not reopen it.
  let closedByUs = false

  function scheduleReconnect() {
    const delay = RECONNECT_DELAYS_MS[attempt]

    // Out of attempts: stay on REST only, without logging anything further.
    if (closedByUs || delay === undefined) return

    attempt += 1
    reconnectTimer = setTimeout(connect, delay)
  }

  function connect() {
    if (import.meta.server || closedByUs) return

    const protocol = location.protocol === 'https:' ? 'wss' : 'ws'

    try {
      socket = new WebSocket(`${protocol}://${location.host}${options.path}`)
    }
    catch {
      scheduleReconnect()
      return
    }

    socket.addEventListener('open', () => {
      isConnected.value = true
      attempt = 0 // a successful connection resets the backoff
      if (socket) options.onOpen?.(socket)
    })

    socket.addEventListener('message', (event) => {
      try {
        options.onMessage(JSON.parse(event.data))
      }
      catch {
        // ignore malformed frames
      }
    })

    // 'close' fires after a failed handshake too, so one handler covers both
    // "the server went away" and "the proxy refused the upgrade".
    socket.addEventListener('close', () => {
      isConnected.value = false
      socket = null
      scheduleReconnect()
    })

    // Without this listener the browser reports the failure as an uncaught
    // error. The retry itself is handled by 'close', which always follows.
    socket.addEventListener('error', () => {
      isConnected.value = false
    })
  }

  function send(payload: unknown) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload))
    }
  }

  function disconnect() {
    closedByUs = true
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    socket?.close()
    socket = null
    isConnected.value = false
  }

  onBeforeUnmount(disconnect)

  return { isConnected, connect, send, disconnect }
}
