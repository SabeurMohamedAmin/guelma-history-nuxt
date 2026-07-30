<script setup lang="ts">
import { useTheme } from 'vuetify'

/**
 * Admin backend navigation: a collapsible sidebar (v-navigation-drawer) plus a
 * sticky top app bar. Desktop shows a persistent drawer with an optional
 * icon-only mini-rail; mobile shows a temporary overlay drawer toggled from the
 * app bar. Fully RTL-aware and driven by Vuetify theme tokens.
 */

// ── Types ───────────────────────────────────────────────────────────────────
interface NavItem {
  /** i18n label key resolved via t(). */
  title: string
  icon: string
  /** Raw route path; passed through localePath() in the template. */
  to: string
  /** Exact route match (used for the dashboard root). */
  exact?: boolean
  /** Optional badge count; only rendered when greater than zero. */
  badge?: number
}

interface NavGroup {
  /** i18n label key resolved via t(). */
  label: string
  icon: string
  /** Stable key used to control the open/closed v-list-group state. */
  value: string
  items: NavItem[]
}

const props = withDefaults(defineProps<{
  /** Pending articles (drafts) shown as a badge on the Articles item. */
  pendingArticles?: number
  /** Pending (unconfirmed) subscribers shown as a badge on Subscribers. */
  pendingSubscribers?: number
  /** Unread notifications shown on the app bar bell. */
  notifications?: number
}>(), {
  pendingArticles: 0,
  pendingSubscribers: 0,
  notifications: 0,
})

// ── Composables ─────────────────────────────────────────────────────────
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { user, clear: clearSession } = useUserSession()

const isRtl = computed(() => locale.value === 'ar')

// ── Responsive + drawer state (SSR-safe) ───────────────────────────────────────
// useWindowSize() returns 0 on the server, so the first render is treated as
// desktop to avoid a hydration mismatch on the drawer.
const mounted = ref(false)
const { width } = useWindowSize()

onMounted(() => {
  mounted.value = true
})

const isDesktop = computed(() => !mounted.value || width.value >= 1280)
const drawer = ref(true)
// Mini-rail (icon-only) mode, desktop only.
const rail = ref(false)
// Pin the drawer open on mobile so it stays persistent instead of closing as a
// temporary overlay. Persisted so the choice survives navigation and reloads.
const pinned = useCookie<boolean>('guelma-admin-nav-pinned', { default: () => false })

watchEffect(() => {
  if (mounted.value) {
    // On mobile, keep the drawer open when pinned; otherwise follow the width.
    drawer.value = width.value >= 1280 || pinned.value
  }
})

// Mini-rail only makes sense on desktop; force it off on mobile.
const isRail = computed(() => isDesktop.value && rail.value)
// On mobile the drawer is a temporary overlay unless the user pinned it open.
const isTemporary = computed(() => !isDesktop.value && !pinned.value)

function toggleRail() {
  rail.value = !rail.value
}

function toggleDrawer() {
  drawer.value = !drawer.value
}

function togglePin() {
  pinned.value = !pinned.value
  // Pinning should reveal the drawer immediately.
  if (pinned.value) {
    drawer.value = true
  }
}

// ── Navigation model ──────────────────────────────────────────────────────
const dashboardItem = computed<NavItem>(() => ({
  title: t('adminNav.dashboard'),
  icon: 'mdi-view-dashboard-outline',
  to: '/admin',
  exact: true,
}))

const navGroups = computed<NavGroup[]>(() => [
  {
    label: t('adminNav.groups.content'),
    icon: 'mdi-folder-text-outline',
    value: 'content',
    items: [
      { title: t('nav.articles'), icon: 'mdi-file-document-outline', to: '/admin/articles', badge: props.pendingArticles },
      { title: t('nav.categories'), icon: 'mdi-folder-outline', to: '/admin/categories' },
      { title: t('nav.authors'), icon: 'mdi-account-group-outline', to: '/admin/authors' },
    ],
  },
  {
    label: t('adminNav.groups.audience'),
    icon: 'mdi-account-multiple-outline',
    value: 'audience',
    items: [
      { title: t('nav.subscribers'), icon: 'mdi-email-outline', to: '/admin/subscribers', badge: props.pendingSubscribers },
      { title: t('adminNav.moderation'), icon: 'mdi-comment-alert-outline', to: '/admin/comments' },
    ],
  },
])

// Group containing the current route (kept for potential future use).
const openGroups = ref<string[]>([])

watch(
  () => route.path,
  () => {
    for (const group of navGroups.value) {
      const active = group.items.some(item => route.path.includes(item.to))
      if (active && !openGroups.value.includes(group.value)) {
        openGroups.value.push(group.value)
      }
    }
  },
  { immediate: true },
)

// ── Reactive page title ──────────────────────────────────────────────────
const pageTitle = computed(() => {
  const path = route.path
  if (path.includes('/admin/articles')) return t('nav.articles')
  if (path.includes('/admin/categories')) return t('nav.categories')
  if (path.includes('/admin/authors')) return t('nav.authors')
  if (path.includes('/admin/subscribers')) return t('nav.subscribers')
  if (path.includes('/admin/comments')) return t('adminNav.moderation')
  if (path.includes('/admin/profile')) return t('profile.title')
  return t('adminNav.dashboard')
})

// ── Avatar ─────────────────────────────────────────────────────────────
const { initials, avatarUrl } = useAdminAvatar(
  () => user.value?.displayName,
  () => user.value?.username,
  () => user.value?.hasAvatar,
  () => user.value?.avatarUpdatedAt,
)

const userName = computed(() => user.value?.displayName || user.value?.username || '')

// ── Theme ──────────────────────────────────────────────────────────────
const vuetifyTheme = useTheme()
const themeCookie = useCookie<'light' | 'dark'>('guelma-theme', { default: () => 'light' })
const isDark = computed(() => vuetifyTheme.global.current.value.dark)

function toggleTheme() {
  const next = isDark.value ? 'light' : 'dark'
  vuetifyTheme.change(next)
  themeCookie.value = next
}

// ── Auth ───────────────────────────────────────────────────────────────
async function onLogout() {
  await clearSession()
  await navigateTo(localePath('/admin/login'), { replace: true })
}
</script>

<template>
  <!-- Sticky top app bar -->
  <v-app-bar
    flat
    height="64"
    density="compact"
    class="admin-appbar border-b pa-0 px-1 "
  >
    <v-app-bar-nav-icon
      class="rounded-lg mx-1"
      size="small"
      variant="text"
      :aria-label="t('nav.menu')"
      @click="isDesktop ? toggleRail() : toggleDrawer()"
    />

    <v-avatar
      size="30"
      color="primary"
      class="ms-1 me-2 flex-shrink-0"
    >
      <v-icon
        icon="mdi-shield-crown"
        size="16"
      />
    </v-avatar>

    <v-app-bar-title class="text-subtitle-1 font-weight-bold">
      {{ pageTitle }}
    </v-app-bar-title>

    <v-spacer />

    <!-- Theme toggle -->
    <v-btn
      icon
      variant="text"
      :aria-label="isDark ? t('theme.light') : t('theme.dark')"
      @click="toggleTheme"
    >
      <v-icon
        :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        size="20"
      />
    </v-btn>

    <!-- Notification bell -->
    <notification-bell />

    <!-- User avatar menu -->
    <v-menu
      location="bottom end"
      offset="8"
    >
      <template #activator="{ props: menuProps }">
        <v-btn
          icon
          variant="text"
          class="ms-1"
          v-bind="menuProps"
          :aria-label="userName"
        >
          <v-avatar
            size="34"
            color="primary"
          >
            <img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="userName"
              class="admin-avatar-image"
            />
            <span
              v-else
              class="text-caption font-weight-bold"
            >{{ initials }}</span>
          </v-avatar>
        </v-btn>
      </template>

      <v-list
        nav
        density="compact"
        min-width="220"
        rounded="lg"
        class="pa-1"
      >
        <v-list-item class="px-3 py-2">
          <v-list-item-title class="text-body-2 font-weight-medium">
            {{ userName }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ t('nav.admin') }}
          </v-list-item-subtitle>
        </v-list-item>

        <v-divider class="my-1" />

        <v-list-item
          :to="localePath('/admin/profile')"
          prepend-icon="mdi-account-outline"
          :title="t('profile.title')"
          rounded="lg"
        />
        <v-list-item
          :href="localePath('/')"
          target="_blank"
          rel="noopener"
          prepend-icon="mdi-open-in-new"
          :title="t('adminNav.viewSite')"
          rounded="lg"
        />

        <v-divider class="my-1" />

        <v-list-item
          prepend-icon="mdi-logout"
          :title="t('auth.logout')"
          base-color="error"
          rounded="lg"
          @click="onLogout"
        />
      </v-list>
    </v-menu>
  </v-app-bar>

  <!-- Sidebar -->
  <v-navigation-drawer
    v-model="drawer"
    :permanent="!isTemporary"
    :temporary="isTemporary"
    :rail="isRail"
    :rail-width="72"
    width="272"
    class="admin-drawer border-e"
  >
    <!-- Brand / collapse toggle -->
    <div
      class="d-flex align-center pa-1"
      :class="isRail ? 'justify-center' : ''"
    >
      <div
        v-if="!isRail"
        class="min-width-0 flex-grow-1"
      >
        <div class="text-subtitle-2 font-weight-bold text-truncate">
          {{ t('common.siteName') }}
        </div>
        <div class="text-caption text-medium-emphasis">
          {{ t('admin.title') }}
        </div>
      </div>
      <v-btn
        v-if="isDesktop && !isRail"
        icon
        size="x-small"
        variant="text"
        :aria-label="t('adminNav.collapse')"
        @click="toggleRail"
      >
        <v-icon :icon="isRtl ? 'mdi-chevron-right' : 'mdi-chevron-left'" />
      </v-btn>
      <v-btn
        v-if="!isDesktop"
        icon
        size="x-small"
        variant="plain"
        :aria-pressed="String(pinned)"
        class="align-self-start rounded-lg  "
        :color="pinned ? 'primary' : undefined"
        :aria-label="pinned ? t('adminNav.unpin') : t('adminNav.pin')"
        @click="togglePin"
      >
        <v-icon
          :icon="pinned ? 'mdi-pin' : 'mdi-pin-outline'"
          size="small"
        />
      </v-btn>
    </div>

    <!-- Expand button when in mini-rail -->
    <div
      v-if="isRail"
      class="d-flex justify-center pb-1"
    >
      <v-btn
        icon
        variant="text"
        size="small"
        :aria-label="t('adminNav.expand')"
        @click="toggleRail"
      >
        <v-icon :icon="isRtl ? 'mdi-chevron-left' : 'mdi-chevron-right'" />
      </v-btn>
    </div>

    <v-divider class="border-opacity-25" />

    <!-- Navigation -->
    <v-list
      nav
      density="compact"
      class="pa-1 align-center justify-center"
    >
      <!-- Dashboard (top-level) -->
      <v-list-item
        :to="localePath(dashboardItem.to)"
        :exact="dashboardItem.exact"
        :prepend-icon="dashboardItem.icon"
        :title="dashboardItem.title"
        rounded="lg"
        color="primary"
        class="mb-1"
      />

      <!-- Flat groups: header label + its items, all visible -->
      <template
        v-for="group in navGroups"
        :key="group.value"
      >
        <v-list-subheader
          v-if="!isRail"
          class="text-overline text-medium-emphasis px-3"
        >
          {{ group.label }}
        </v-list-subheader>
        <v-divider
          v-else
          class="ma-1 border-opacity-25"
        />

        <v-list-item
          v-for="item in group.items"
          :key="item.to"
          :to="localePath(item.to)"
          :prepend-icon="item.icon"
          :title="item.title"
          rounded="lg"
          color="primary"
          class="mb-1"
        >
          <template
            v-if="item.badge && item.badge > 0"
            #append
          >
            <v-chip
              size="x-small"
              color="primary"
              variant="flat"
            >
              {{ item.badge }}
            </v-chip>
          </template>
        </v-list-item>
      </template>
    </v-list>

    <!-- Footer: profile + logout -->
    <template #append>
      <v-divider class="border-opacity-25" />
      <div class="pa-1">
        <v-list-item
          v-if="user && !isRail"
          :to="localePath('/admin/profile')"
          rounded="lg"
          density="comfortable"
          class="mb-1 px-2"
        >
          <template #prepend>
            <v-avatar
              size="default"
              color="primary"
              class="flex-shrink-0 rounded-lg"
            >
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                :alt="userName"
                class="admin-avatar-image"
              />
              <span
                v-else
                class="text-body-small font-weight-medium"
              >
                {{ initials }}
              </span>
            </v-avatar>
          </template>
          <v-list-item-title class="py-1 text-body-small text-md-body-medium font-weight-medium text-truncate">
            {{ userName }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-label-small text-md-body-small py-1">
            {{ t('nav.admin') }}
          </v-list-item-subtitle>
        </v-list-item>

        <div
          class="admin-locale-switcher mb-1"
          :class="{ 'd-flex justify-center': isRail }"
        >
          <layout-locale-switcher :block="!isRail" />
        </div>

        <v-btn
          variant="tonal"
          color="error"
          rounded="lg"
          size="small"
          block
          class="text-none font-weight-medium"
          :icon="isRail"
          @click="onLogout"
        >
          <v-icon
            icon="mdi-logout"
            :start="!isRail"
          />
          <span v-if="!isRail">{{ t('auth.logout') }}</span>
        </v-btn>
      </div>
    </template>
  </v-navigation-drawer>
</template>

<style scoped>
.admin-appbar {
  background-color: rgba(var(--v-theme-surface), 0.85) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12) !important;
}

.admin-drawer {
  background-color: rgb(var(--v-theme-surface)) !important;
}

.admin-locale-switcher :deep(.v-btn) {
  max-width: 100%;
}

.admin-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.min-width-0 {
  min-width: 0;
}
</style>
