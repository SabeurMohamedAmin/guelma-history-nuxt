<script setup lang="ts">
import { useTheme } from 'vuetify'

/**
 * Author backend navigation.
 *
 * A faithful counterpart to <AdminNavigation>: the same collapsible sidebar
 * (v-navigation-drawer) + sticky top app bar, RTL-aware and theme-driven, so
 * the author area looks and behaves identically to the admin area.
 *
 * Differences from admin (intentional, keeps the flows separated):
 * - Author branding (feather icon, author title/subtitle) instead of admin's
 *   shield/crown.
 * - Author-scoped links only (dashboard + their own articles). Authors do not
 *   manage categories, authors or subscribers, so those groups are omitted.
 * - Logout returns to /author/login.
 */

// ── Types ──────────────────────────────────────────────────
interface NavItem {
  title: string
  icon: string
  to: string
  exact?: boolean
  badge?: number
}

interface NavGroup {
  label: string
  icon: string
  value: string
  items: NavItem[]
}

const props = withDefaults(defineProps<{
  /** Pending articles (drafts) shown as a badge on the Articles item. */
  pendingArticles?: number
  /** Unread notifications shown on the app bar bell. */
  notifications?: number
}>(), {
  pendingArticles: 0,
  notifications: 0,
})

// ── Composables ────────────────────────────────────
const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { user, clear: clearSession } = useUserSession()

const isRtl = computed(() => locale.value === 'ar')

// ── Responsive + drawer state (SSR-safe) ──────────────────────────
const mounted = ref(false)
const { width } = useWindowSize()

onMounted(() => {
  mounted.value = true
})

const isDesktop = computed(() => !mounted.value || width.value >= 1280)
const drawer = ref(true)
const rail = ref(false)
const pinned = useCookie<boolean>('guelma-author-nav-pinned', { default: () => false })

watchEffect(() => {
  if (mounted.value) {
    drawer.value = width.value >= 1280 || pinned.value
  }
})

const isRail = computed(() => isDesktop.value && rail.value)
const isTemporary = computed(() => !isDesktop.value && !pinned.value)

function toggleRail() {
  rail.value = !rail.value
}

function toggleDrawer() {
  drawer.value = !drawer.value
}

function togglePin() {
  pinned.value = !pinned.value
  if (pinned.value) {
    drawer.value = true
  }
}

// ── Navigation model ─────────────────────────────────────
const dashboardItem = computed<NavItem>(() => ({
  title: t('adminNav.dashboard'),
  icon: 'mdi-view-dashboard-outline',
  to: '/author',
  exact: true,
}))

const navGroups = computed<NavGroup[]>(() => [
  {
    label: t('adminNav.groups.content'),
    icon: 'mdi-folder-text-outline',
    value: 'content',
    items: [
      { title: t('nav.articles'), icon: 'mdi-file-document-outline', to: '/author/articles', badge: props.pendingArticles },
    ],
  },
])

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

// ── Reactive page title ─────────────────────────────────
const pageTitle = computed(() => {
  const path = route.path
  if (path.includes('/author/articles')) return t('nav.articles')
  return t('adminNav.dashboard')
})

// ── Avatar ─────────────────────────────────────────
const { initials, avatarUrl } = useAdminAvatar(
  () => user.value?.displayName,
  () => user.value?.username,
  () => user.value?.hasAvatar,
  () => user.value?.avatarUpdatedAt,
)

const userName = computed(() => user.value?.displayName || user.value?.username || '')

// ── Theme ────────────────────────────────────────
const vuetifyTheme = useTheme()
const themeCookie = useThemeCookie()
const isDark = computed(() => vuetifyTheme.global.current.value.dark)

function toggleTheme() {
  const next = isDark.value ? 'light' : 'dark'
  vuetifyTheme.change(next)
  themeCookie.value = next
}

// ── Auth ────────────────────────────────────────
async function onLogout() {
  await clearSession()
  await navigateTo(localePath('/author/login'), { replace: true })
}
</script>

<template>
  <v-app-bar
    flat
    height="64"
    class="author-appbar border-b px-1"
  >
    <v-app-bar-nav-icon
      class="rounded-lg"
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
        icon="mdi-feather"
        size="16"
      />
    </v-avatar>
    <v-app-bar-title class="text-subtitle-1 font-weight-bold">
      {{ pageTitle }}
    </v-app-bar-title>

    <v-spacer />

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

    <notification-bell />

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
              class="author-avatar-image"
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
            {{ t('nav.author') }}
          </v-list-item-subtitle>
        </v-list-item>

        <v-divider class="my-1" />

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

  <v-navigation-drawer
    v-model="drawer"
    :permanent="!isTemporary"
    :temporary="isTemporary"
    :rail="isRail"
    :rail-width="72"
    width="272"
    class="author-drawer border-e"
  >
    <div class="d-flex align-center ga-2 pa-3">
      <v-avatar
        size="36"
        color="primary"
        class="flex-shrink-0"
      >
        <v-icon
          icon="mdi-feather"
          size="20"
        />
      </v-avatar>
      <div class="min-width-0 flex-grow-1">
        <div class="text-subtitle-2 font-weight-bold text-truncate">
          {{ t('common.siteName') }}
        </div>
        <div class="text-caption text-medium-emphasis">
          {{ t('author.title') }}
        </div>
      </div>
      <v-btn
        v-if="isDesktop && !isRail"
        icon
        variant="text"
        size="small"
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
        class="align-self-start rounded-lg"
        :color="pinned ? 'primary' : undefined"
        :aria-label="pinned ? t('adminNav.unpin') : t('adminNav.pin')"
        @click="togglePin"
      >
        <v-icon
          :icon="pinned ? 'mdi-pin' : 'mdi-pin-outline'"
          size="20"
        />
      </v-btn>
    </div>

    <div
      v-if="isRail"
      class="d-flex justify-center pb-2"
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

    <v-list
      nav
      density="compact"
      class="px-2 py-2"
    >
      <v-list-item
        :to="localePath(dashboardItem.to)"
        :exact="dashboardItem.exact"
        :prepend-icon="dashboardItem.icon"
        :title="dashboardItem.title"
        rounded="lg"
        color="primary"
        class="mb-1"
      />

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
          class="mx-2 my-1 border-opacity-25"
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

    <template #append>
      <v-divider class="border-opacity-25" />
      <div class="pa-2">
        <v-list-item
          v-if="user && !isRail"
          rounded="lg"
          density="compact"
          class="mb-2"
        >
          <template #prepend>
            <v-avatar
              size="34"
              color="primary"
              class="flex-shrink-0"
            >
              <img
                v-if="avatarUrl"
                :src="avatarUrl"
                :alt="userName"
                class="author-avatar-image"
              />
              <span
                v-else
                class="text-caption font-weight-bold"
              >{{ initials }}</span>
            </v-avatar>
          </template>
          <v-list-item-title class="text-body-2 font-weight-medium text-truncate">
            {{ userName }}
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ t('nav.author') }}
          </v-list-item-subtitle>
        </v-list-item>

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
.author-appbar {
  background-color: rgba(var(--v-theme-surface), 0.85) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(var(--v-border-color), 0.12) !important;
}

.author-drawer {
  background-color: rgb(var(--v-theme-surface)) !important;
}

.author-avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.min-width-0 {
  min-width: 0;
}
</style>
