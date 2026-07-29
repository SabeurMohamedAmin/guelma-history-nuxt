<script setup lang="ts">
/**
 * User avatar menu shown in the user navbar.
 *
 * Displays the logged-in user's profile picture, fetched from the database via
 * the authenticated `/api/auth/user/avatar` endpoint (using the session's
 * `hasAvatar` / `avatarUpdatedAt` flags). Falls back to the user's initials
 * placeholder when no picture is stored or the image fails to load. When nobody
 * is logged in it simply links to the login page.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()

// True once an avatar image fails to load, so we fall back to the initials.
const imageFailed = ref(false)

const displayName = computed(() => auth.user?.displayName ?? auth.user?.username ?? '')

// Initials placeholder shown when there is no picture (or it failed to load).
const initials = computed(() => {
  const parts = displayName.value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
})

// Database-backed profile picture URL, versioned so a new upload busts the
// browser cache. Null when the user has no avatar or the image failed to load.
const avatarUrl = computed(() => {
  if (!auth.user?.hasAvatar || imageFailed.value) return null
  const version = auth.user?.avatarUpdatedAt
  const query = version ? `?v=${encodeURIComponent(version)}` : ''
  return `/api/auth/user/avatar${query}`
})

async function onLogout() {
  await auth.clear()
  await navigateTo(localePath('/'))
}
</script>

<template>
  <!-- Logged out: simple login button -->
  <v-btn
    v-if="!auth.loggedIn"
    icon
    variant="text"
    size="small"
    :to="localePath('/login')"
    :aria-label="t('nav.login')"
  >
    <v-icon
      size="24"
      icon="mdi-account-circle-outline"
    />
  </v-btn>

  <!-- Logged in: profile picture with dropdown menu -->
  <notification-bell v-if="auth.loggedIn" />

  <v-menu
    v-if="auth.loggedIn"
    location="bottom end"
    offset="8"
    transition="slide-y-transition"
  >
    <template #activator="{ props }">
      <v-btn
        v-bind="props"
        icon
        variant="text"
        size="small"
        :aria-label="t('nav.account')"
      >
        <v-avatar size="32">
          <v-img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="displayName"
            cover
            @error="imageFailed = true"
          />
          <span
            v-else
            class="text-body-2 font-weight-bold"
          >
            {{ initials }}
          </span>
        </v-avatar>
      </v-btn>
    </template>

    <v-list
      nav
      density="compact"
      rounded="xl"
      class="app-dropdown pa-1"
      min-width="220"
    >
      <v-list-item class="mb-1">
        <template #prepend>
          <v-avatar
            size="36"
            color="primary"
          >
            <v-img
              v-if="avatarUrl"
              :src="avatarUrl"
              :alt="displayName"
              cover
              @error="imageFailed = true"
            />
            <span
              v-else
              class="text-body-2 font-weight-bold"
            >{{ initials }}</span>
          </v-avatar>
        </template>
        <v-list-item-title class="text-body-2 font-weight-medium text-truncate">
          {{ displayName }}
        </v-list-item-title>
      </v-list-item>

      <v-divider class="my-1" />

      <v-list-item
        :to="localePath('/profile')"
        rounded="lg"
        prepend-icon="mdi-account-outline"
      >
        <v-list-item-title class="text-body-2">
          {{ t('nav.profile') }}
        </v-list-item-title>
      </v-list-item>

      <v-list-item
        :to="localePath('/reading-list')"
        rounded="lg"
        prepend-icon="mdi-bookmark-multiple-outline"
      >
        <v-list-item-title class="text-body-2">
          {{ t('nav.readingList') }}
        </v-list-item-title>
      </v-list-item>

      <v-list-item
        rounded="lg"
        prepend-icon="mdi-logout"
        @click="onLogout"
      >
        <v-list-item-title class="text-body-2">
          {{ t('auth.logout') }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<style scoped>
.app-dropdown {
  border: 1px solid rgb(var(--v-border-color) / 0.12);
  box-shadow:
    0 4px 6px rgb(0 0 0 / 0.06),
    0 12px 24px rgb(0 0 0 / 0.10) !important;
}
</style>
