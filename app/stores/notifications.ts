import type { NotificationItem, NotificationMute, MuteScope } from '~~/shared/types/notification'

interface ListResponse {
  success: boolean
  data: NotificationItem[]
  // Keyset cursor: the createdAt of the last notification seen, or absent on
  // the final page (notifications use uuid ids, so we page on createdAt).
  nextCursor: string | null
}

interface CountResponse {
  success: boolean
  data: { count: number }
}

interface MutesResponse {
  success: boolean
  data: NotificationMute[]
}

/**
 * Owns the current user's in-app notification state.
 *
 * Responsibilities:
 * - keep the unread badge count for the bell,
 * - load the notification list (load-more paginated),
 * - mark one / all as read (with an optimistic unread decrement),
 * - list / add / remove mutes.
 *
 * The store talks to the REST API for normal reads/writes and exposes
 * `applyIncoming` for the per-user websocket listener to prepend live
 * notifications and bump the unread badge.
 */
export const useNotificationsStore = defineStore('notifications', () => {
  const items = ref<NotificationItem[]>([])
  const unreadCount = ref(0)
  const mutes = ref<NotificationMute[]>([])
  const nextCursor = ref<string | null>(null)
  const pending = ref(false)

  const PAGE_SIZE = 20
  const hasMore = computed(() => nextCursor.value !== null)
  const hasUnread = computed(() => unreadCount.value > 0)

  /** Refresh just the unread badge count (cheap; used to poll for new ones). */
  async function refreshUnreadCount() {
    try {
      const res = await $fetch<CountResponse>('/api/notifications/unread-count')
      unreadCount.value = res.data.count
    }
    catch {
      // A failed count must not break the UI; keep the last known value.
    }
  }

  /** Load the first page of notifications (replaces the list). */
  async function load() {
    pending.value = true
    try {
      const res = await $fetch<ListResponse>('/api/notifications', {
        query: { limit: PAGE_SIZE },
      })
      items.value = res.data
      nextCursor.value = res.nextCursor
    }
    finally {
      pending.value = false
    }
  }

  /** Append the next page (the load-more button). */
  async function loadMore() {
    if (!hasMore.value || pending.value) return
    pending.value = true
    try {
      const res = await $fetch<ListResponse>('/api/notifications', {
        query: { limit: PAGE_SIZE, cursor: nextCursor.value ?? undefined },
      })
      const existingIds = new Set(items.value.map(item => item.id))
      const newItems = res.data.filter(item => !existingIds.has(item.id))
      items.value.push(...newItems)
      nextCursor.value = res.nextCursor
    }
    finally {
      pending.value = false
    }
  }

  /** Mark one notification as read, decrementing the badge optimistically. */
  async function markRead(id: string) {
    const item = items.value.find(n => n.id === id)
    if (!item || item.isRead) return
    item.isRead = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    try {
      await $fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
    }
    catch {
      // Roll back if the server rejected it.
      item.isRead = false
      unreadCount.value += 1
    }
  }

  /** Mark every notification as read. */
  async function markAllRead() {
    const previous = items.value.map(n => n.isRead)
    items.value.forEach(n => (n.isRead = true))
    unreadCount.value = 0
    try {
      await $fetch('/api/notifications/read-all', { method: 'PATCH' })
    }
    catch {
      items.value.forEach((n, i) => (n.isRead = previous[i] ?? n.isRead))
      await refreshUnreadCount()
    }
  }

  /** Delete one notification from the menu, with rollback on failure. */
  async function remove(id: string) {
    const index = items.value.findIndex(n => n.id === id)
    if (index === -1) return

    const [removed] = items.value.splice(index, 1)
    if (removed && !removed.isRead) unreadCount.value = Math.max(0, unreadCount.value - 1)

    try {
      await $fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    }
    catch {
      if (removed) {
        items.value.splice(index, 0, removed)
        if (!removed.isRead) unreadCount.value += 1
      }
    }
  }

  // --- Mutes ---------------------------------------------------------------

  /** Load the user's mutes (so the UI can show what is muted). */
  async function loadMutes() {
    const res = await $fetch<MutesResponse>('/api/notifications/mutes')
    mutes.value = res.data
  }

  /** Mute a target. Pass the matching id for 'article' / 'comment' scopes. */
  async function mute(scope: MuteScope, target?: { articleId?: number, commentId?: string }) {
    await $fetch('/api/notifications/mutes', {
      method: 'POST',
      body: { scope, articleId: target?.articleId, commentId: target?.commentId },
    })
    await loadMutes()
  }

  /** Remove a mute by id (unmute). */
  async function unmute(muteId: number) {
    await $fetch(`/api/notifications/mutes/${muteId}`, { method: 'DELETE' })
    mutes.value = mutes.value.filter(m => m.id !== muteId)
  }

  /**
   * Apply a notification pushed over the websocket: prepend it (if not already
   * present) and bump the unread badge. Called by the bell's socket listener.
   */
  function applyIncoming(item: NotificationItem) {
    if (items.value.some(n => n.id === item.id)) return
    items.value.unshift(item)
    if (!item.isRead) unreadCount.value += 1
  }

  /** Reset all state (e.g. on logout). */
  function reset() {
    items.value = []
    unreadCount.value = 0
    mutes.value = []
    nextCursor.value = null
  }

  return {
    // state
    items,
    unreadCount,
    mutes,
    pending,
    hasMore,
    hasUnread,
    // notifications
    refreshUnreadCount,
    load,
    loadMore,
    markRead,
    markAllRead,
    remove,
    applyIncoming,
    // mutes
    loadMutes,
    mute,
    unmute,
    // lifecycle
    reset,
  }
})
