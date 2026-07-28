<script setup lang="ts">
/**
 * Notification bell shown in the user navbar (logged-in users only).
 *
 * Shows an unread badge and, on click, a dropdown of recent notifications.
 * Opening the menu loads the list; clicking an item marks it read and deep-
 * links to the triggering comment via `?comment=<uuid>` on the article page.
 *
 * State lives in the notifications store; this component is just the view. When
 * the per-user websocket is added later, the store updates and this UI reacts
 * automatically with no change here.
 */
import type { NotificationItem } from '~~/shared/types/notification'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const notifications = useNotificationsStore()

const open = ref(false)

// Realtime: subscribe to this user's notification room and apply pushed events
// instantly. The 60s poll is the fallback whenever the socket is unavailable,
// so the badge stays correct even if the upgrade is refused in production.
const POLL_INTERVAL_MS = 60_000
let pollTimer: ReturnType<typeof setInterval> | null = null

const socket = useRealtimeSocket({
  path: '/_ws/notifications',
  onOpen: () => socket.send({ type: 'subscribe' }),
  onMessage: (data) => {
    const evt = data as { type: string, notification?: NotificationItem }
    if (evt.type === 'created' && evt.notification) notifications.applyIncoming(evt.notification)
  },
})

onMounted(() => {
  void notifications.refreshUnreadCount()
  pollTimer = setInterval(() => void notifications.refreshUnreadCount(), POLL_INTERVAL_MS)
  socket.connect()
})
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
})

// Load the list (and the mutes, for the mute-all toggle) the first time the
// dropdown is opened.
watch(open, (isOpen) => {
  if (isOpen) {
    void notifications.load()
    void notifications.loadMutes()
  }
})

// Whether the user has a global "mute all" in place, and the toggle for it.
const mutedAll = computed(() => notifications.mutes.find(m => m.scope === 'all'))
async function toggleMuteAll() {
  if (mutedAll.value) await notifications.unmute(mutedAll.value.id)
  else await notifications.mute('all')
}

/** The localized, human-readable message for one notification. */
function messageFor(item: NotificationItem): string {
  const actor = item.actor?.displayName ?? item.actor?.username ?? t('notifications.someone')
  return t(`notifications.message.${item.type}`, { actor })
}

/** Relative time ("3 hours ago"), localized. */
function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const rtf = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
  const minutes = Math.round(diffMs / 60_000)
  if (Math.abs(minutes) < 60) return rtf.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(-hours, 'hour')
  return rtf.format(-Math.round(hours / 24), 'day')
}

/** The deep link to the triggering comment on its article page (by slug). */
function linkFor(item: NotificationItem): string {
  return localePath(`/articles/${item.articleSlug}?comment=${item.commentId}`)
}

/** Mark read, then navigate to the comment. */
async function onOpenItem(item: NotificationItem) {
  open.value = false
  await notifications.markRead(item.id)
  await navigateTo(linkFor(item))
}

/** Delete without triggering the list item navigation click. */
async function onDeleteItem(item: NotificationItem) {
  await notifications.remove(item.id)
}
</script>

<template>
  <v-menu
    v-model="open"
    location="bottom end"
    offset="8"
    transition="slide-y-transition"
    :close-on-content-click="false"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        variant="text"
        size="small"
        :aria-label="t('notifications.title')"
      >
        <v-badge
          :model-value="notifications.hasUnread"
          :content="notifications.unreadCount"
          color="error"
          max="99"
        >
          <v-icon
            size="22"
            icon="mdi-bell-outline"
          />
        </v-badge>
      </v-btn>
    </template>

    <v-card
      width="360"
      max-width="92vw"
      rounded="xl"
      class="app-dropdown"
    >
      <div class="d-flex align-center justify-space-between px-4 py-3">
        <div class="d-flex align-center ga-2">
          <span class="text-subtitle-2 font-weight-bold">{{ t('notifications.title') }}</span>
          <v-chip
            v-if="notifications.hasUnread"
            color="error"
            variant="flat"
            size="x-small"
            class="notification-unread-count"
            :aria-label="t('notifications.unreadCount', { count: notifications.unreadCount })"
          >
            {{ notifications.unreadCount }}
          </v-chip>
        </div>
        <v-btn
          v-if="notifications.hasUnread"
          variant="text"
          size="x-small"
          class="app-dropdown__action"
          @click="notifications.markAllRead()"
        >
          {{ t('notifications.markAllRead') }}
        </v-btn>
      </div>

      <v-divider />

      <div class="d-flex align-center justify-space-between px-4 py-2">
        <span class="text-caption text-medium-emphasis">
          {{ mutedAll ? t('notifications.mute.allOn') : '' }}
        </span>
        <v-btn
          variant="text"
          size="x-small"
          class="app-dropdown__action"
          :prepend-icon="mutedAll ? 'mdi-bell-off-outline' : 'mdi-bell-outline'"
          @click="toggleMuteAll"
        >
          {{ mutedAll ? t('notifications.mute.unmute') : t('notifications.mute.all') }}
        </v-btn>
      </div>

      <v-divider />

      <div class="notification-list">
        <v-progress-linear
          v-if="notifications.pending && notifications.items.length === 0"
          indeterminate
          color="primary"
        />

        <div
          v-else-if="notifications.items.length === 0"
          class="text-center text-medium-emphasis py-8 px-4"
        >
          {{ t('notifications.empty') }}
        </div>

        <v-list
          v-else
          nav
          density="compact"
          class="pa-1"
        >
          <v-list-item
            v-for="item in notifications.items"
            :key="item.id"
            rounded="lg"
            class="mb-1"
            :class="{ 'notification-item--unread': !item.isRead }"
            @click="onOpenItem(item)"
          >
            <template #prepend>
              <v-icon
                size="18"
                icon="mdi-comment-text-outline"
                class="me-2"
              />
            </template>

            <v-list-item-title
              class="text-body-2 text-wrap"
              dir="auto"
            >
              {{ messageFor(item) }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ timeAgo(item.createdAt) }}
            </v-list-item-subtitle>

            <template #append>
              <div class="notification-item__append">
                <span
                  v-if="!item.isRead"
                  class="notification-item__dot"
                  :aria-label="t('notifications.unread')"
                ></span>
                <v-btn
                  icon="mdi-delete-outline"
                  variant="text"
                  size="x-small"
                  color="error"
                  :aria-label="t('notifications.delete')"
                  @click.stop="onDeleteItem(item)"
                />
              </div>
            </template>
          </v-list-item>
        </v-list>

        <div
          v-if="notifications.hasMore"
          class="pa-2"
        >
          <v-btn
            variant="text"
            block
            size="small"
            :loading="notifications.pending"
            @click="notifications.loadMore()"
          >
            {{ t('notifications.loadMore') }}
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-menu>
</template>

<style scoped>
.app-dropdown {
  border: 1px solid rgb(var(--v-border-color) / 0.12);
  box-shadow:
    0 4px 6px rgb(0 0 0 / 0.06),
    0 12px 24px rgb(0 0 0 / 0.10) !important;
}

.app-dropdown__action {
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.notification-list {
  max-height: 60vh;
  overflow-y: auto;
}

.notification-unread-count {
  min-width: 1.35rem;
  justify-content: center;
  font-weight: 800;
}

/* Unread rows get a subtle tint so they stand out from already-read ones. */
.notification-item--unread {
  background-color: rgb(var(--v-theme-primary) / 0.06);
}

.notification-item__append {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.notification-item__dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: rgb(var(--v-theme-primary));
}
</style>
