<script setup lang="ts">
/**
 * User navigation bar.
 *
 * Self-contained navbar for signed-in users, independent of the shared
 * <LayoutAppHeader> (same pattern as <AdminNavigation> / <AuthorNavigation>).
 * It mirrors the default header (logo, primary nav, theme toggle, search,
 * locale switcher, 920px hamburger drawer) but shows the user's profile avatar
 * menu instead of the login icon.
 */
import { useTheme } from 'vuetify'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const vuetifyTheme = useTheme()
const themeCookie = useThemeCookie()
const uiStore = useUiStore()

const drawer = ref(false)

// Freeze the page while the drawer is open, so scrolling inside it (or over
// the scrim) does not move the content behind.
usePageScrollLock(drawer)

const { y } = useWindowScroll()
const isScrolled = computed(() => y.value > 0)

// The hamburger menu takes over at 920px and under. Vuetify's built-in `md`
// breakpoint is 960px, so we track the window width ourselves to hit 920px
// exactly and keep the mobile/desktop switch reactive.
const MOBILE_BREAKPOINT = 920
const { width: windowWidth } = useWindowSize()
const isCompact = computed(() => windowWidth.value <= MOBILE_BREAKPOINT)

watch(() => route.fullPath, () => {
  drawer.value = false
})

const navLinks = computed(() => [
  { title: t('nav.sites'), to: localePath('/categories/sites-historiques') },
  { title: t('nav.culture'), to: localePath('/categories/culture-patrimoine') },
  { title: t('nav.events'), to: localePath('/categories/evenements') },
  { title: t('nav.people'), to: localePath('/categories/personnalites') },
  { title: t('nav.chronological'), to: localePath('/timeline') },
])

const moreLinks = computed(() => [
  { title: t('nav.categoriesIndex'), to: localePath('/categories') },
  { title: t('nav.aboutUs'), to: localePath('/about') },
  { title: t('nav.contact'), to: localePath('/contact') },
])

const isDark = computed(() => vuetifyTheme.global.current.value.dark)

function toggleTheme() {
  const next = isDark.value ? 'light' : 'dark'
  vuetifyTheme.change(next)
  themeCookie.value = next
}
</script>

<template>
  <v-app-bar
    flat
    class="app-header general-width "
    height="64"
    :class="{ 'app-header--floating': isScrolled }"
  >
    <!-- Compact (≤ 920px): hamburger + centered logo + actions -->
    <div
      v-if="isCompact"
      class="app-header__mobile d-flex align-center w-100"
    >
      <div class="app-header__side">
        <v-btn
          icon
          variant="text"
          size="small"
          :aria-label="drawer ? t('nav.closeMenu') : t('nav.openMenu')"
          :aria-expanded="String(drawer)"
          aria-controls="user-nav-drawer"
          @click="drawer = !drawer"
        >
          <v-icon>{{ drawer ? 'mdi-close' : 'mdi-menu' }}</v-icon>
        </v-btn>
      </div>

      <div class="app-header__center overflow-hidden  d-flex align-center justify-center w-100">
        <layout-brand-logo class="app-header__mobile-logo" />
      </div>

      <div class="app-header__side app-header__actions">
        <v-btn
          icon
          variant="text"
          size="small"
          :aria-label="isDark ? t('theme.switchLight') : t('theme.switchDark')"
          @click="toggleTheme"
        >
          <v-icon
            size="20"
            :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
          />
        </v-btn>

        <!-- `data-search-activator` lets <LayoutAppSearch> anchor itself here. -->
        <v-btn
          icon
          variant="text"
          size="small"
          data-search-activator
          :aria-label="t('nav.search')"
          @click="uiStore.openSearch()"
        >
          <v-icon
            size="20"
            icon="mdi-magnify"
          />
        </v-btn>

        <!-- Profile avatar instead of the login icon -->
        <layout-user-menu />
      </div>
    </div>

    <!-- Full (> 920px): logo + nav + actions -->
    <template v-else>
      <layout-brand-logo class="ms-2 ms-sm-3 me-1" />

      <nav
        class="d-none d-md-flex align-center ga-1"
        :aria-label="t('nav.primary')"
      >
        <v-btn
          v-for="link in navLinks.slice(0, 3)"
          :key="link.to"
          :to="link.to"
          variant="text"
          rounded="pill"
          class="app-header__nav-btn text-no-wrap"
        >
          {{ link.title }}
        </v-btn>

        <v-btn
          v-for="link in navLinks.slice(3)"
          :key="link.to"
          :to="link.to"
          variant="text"
          rounded="pill"
          class="app-header__nav-btn text-no-wrap d-none d-xl-inline-flex"
        >
          {{ link.title }}
        </v-btn>
      </nav>

      <v-menu
        location="bottom end"
        offset="8"
        transition="slide-y-transition"
        class="mx-2"
      >
        <template #activator="{ props }">
          <v-btn
            variant="text"
            rounded="pill"
            class="d-none d-md-inline-flex d-xl-none app-header__btn-text"
            v-bind="props"
          >
            {{ t('nav.more') }} ...
            <v-icon
              end
              size="16"
              icon="mdi-chevron-down"
            />
          </v-btn>
        </template>

        <v-list
          nav
          density="compact"
          rounded="xl"
          class="app-dropdown pa-1"
          min-width="220"
        >
          <v-list-item
            v-for="link in navLinks.slice(3)"
            :key="link.to"
            :to="link.to"
            rounded="lg"
            class="mb-1"
          >
            <v-list-item-title class="text-body-2 font-weight-medium">
              {{ link.title }}
            </v-list-item-title>
          </v-list-item>

          <v-divider class="my-2" />

          <v-list-item
            v-for="link in moreLinks"
            :key="link.to"
            :to="link.to"
            rounded="lg"
            class="mb-1"
          >
            <v-list-item-title class="text-body-2 text-medium-emphasis">
              {{ link.title }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-menu
        location="bottom end"
        offset="8"
        transition="slide-y-transition"
        class="mx-2"
      >
        <template #activator="{ props }">
          <v-btn
            variant="text"
            size="small"
            rounded="pill"
            class="d-none d-xl-inline-flex app-header__btn-text"
            v-bind="props"
          >
            {{ t('nav.more') }}
            <v-icon
              end
              size="16"
              icon="mdi-chevron-down"
            />
          </v-btn>
        </template>

        <v-list
          nav
          density="compact"
          rounded="xl"
          class="app-dropdown pa-1"
          min-width="200"
        >
          <v-list-item
            v-for="link in moreLinks"
            :key="link.to"
            :to="link.to"
            rounded="lg"
            class="mb-1"
          >
            <v-list-item-title class="text-body-2">
              {{ link.title }}
            </v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>

      <v-spacer />

      <v-btn
        variant="tonal"
        size="small"
        rounded="pill"
        class="d-none d-xl-inline-flex app-header__btn-text me-1"
      >
        {{ t('nav.support') }}
      </v-btn>

      <v-btn
        icon
        variant="text"
        size="small"
        :aria-label="isDark ? t('theme.switchLight') : t('theme.switchDark')"
        @click="toggleTheme"
      >
        <v-icon
          size="20"
          :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
        />
      </v-btn>

      <!-- `data-search-activator` lets <LayoutAppSearch> anchor itself here. -->
      <v-btn
        icon
        variant="text"
        size="small"
        data-search-activator
        :aria-label="t('nav.search')"
        @click="uiStore.openSearch()"
      >
        <v-icon
          size="20"
          icon="mdi-magnify"
        />
      </v-btn>

      <layout-locale-switcher class="ms-1 me-1" />

      <!-- Profile avatar instead of the login icon -->
      <layout-user-menu />
    </template>
  </v-app-bar>

  <v-navigation-drawer
    id="user-nav-drawer"
    v-model="drawer"
    location="end"
    width="300"
    temporary
    :class="{ drw: isScrolled }"
  >
    <template #prepend>
      <div class="d-flex align-center justify-space-between px-2">
        <layout-brand-logo />
        <v-btn
          icon="mdi-close"
          variant="text"
          size="small"
          :aria-label="t('nav.closeMenu')"
          @click="drawer = false"
        />
      </div>
      <v-divider />
    </template>

    <v-list
      nav
      class="pa-2"
    >
      <v-list-subheader class="text-overline">
        {{ t('nav.categories') }}
      </v-list-subheader>

      <v-list-item
        v-for="link in navLinks"
        :key="link.to"
        :to="link.to"
        rounded="lg"
        class="mb-1"
      >
        <v-list-item-title class="text-body-2 font-weight-medium">
          {{ link.title }}
        </v-list-item-title>
      </v-list-item>

      <v-divider class="my-3" />

      <v-list-item
        v-for="link in moreLinks"
        :key="link.to"
        :to="link.to"
        rounded="lg"
        class="mb-1"
      >
        <v-list-item-title class="text-body-2">
          {{ link.title }}
        </v-list-item-title>
      </v-list-item>
    </v-list>

    <template #append>
      <v-divider />
      <div class="pa-3 d-flex flex-column ga-2">
        <v-btn
          color="primary"
          variant="tonal"
          rounded="pill"
          block
          class="app-header__btn-text"
        >
          {{ t('nav.support') }}
        </v-btn>
        <layout-locale-switcher block />
      </div>
    </template>
  </v-navigation-drawer>
</template>

<style scoped>
.drw {
  top: 75px !important;
  border-radius: 16px !important;
  overflow: hidden !important;
  padding-top: 10px;
  height: calc(100vh - 90px) !important;
}

.v-navigation-drawer--active.drw {
  margin: 0 6px !important;
}

#user-nav-drawer > * {
  width: 99%;
}

.app-header--floating {
  border: 2px solid rgb(var(--v-border-color) / 0.20) !important;
  top: 5px !important;
  inset-inline: 5px !important;
  width: auto !important;
  margin: 0 !important;
  border-radius: 16px !important;
  box-shadow:
    0 2px 8px rgb(0 0 0 / 0.08),
    0 8px 24px rgb(0 0 0 / 0.10) !important;
}

.app-header__mobile {
  padding-inline: 8px;
}

.app-header__side {
  min-width: 75px;
  display: flex;
  align-items: center;
  justify-content: start;
}

.app-header__actions {
  justify-content: flex-end;
  gap: 2px;
}

[dir="rtl"] .app-header__actions {
  justify-content: flex-start;
}

.app-header__mobile-logo {
  max-width: 100%;
}

.app-header__btn-text {
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.app-header__nav-btn {
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-weight: 500;
  white-space: nowrap;
}

.app-header__nav-btn.v-btn--active {
  color: rgb(var(--v-theme-primary));
  background-color: rgb(var(--v-theme-primary) / 0.10);
  font-weight: 600;
}

.app-dropdown {
  border: 1px solid rgb(var(--v-border-color) / 0.12);
  box-shadow:
  0 4px 6px rgb(0 0 0 / 0.06),
  0 12px 24px rgb(0 0 0 / 0.10) !important;
}

@media (max-width: 599.98px) {
  .general-width {
    min-width: 350px !important;
    border: 1px solid rgb(var(--v-border-color) / 0.12);
  }

  .app-header__side {
    min-width: 50px !important;
  }

}

/* ── App bar: glass background + border ─────────────────────────── */
.app-header {
  border-bottom: 1px solid rgb(var(--v-border-color) / 0.10) !important;
  transition:
    top            0.3s cubic-bezier(0.16, 1, 0.3, 1),
    inset-inline   0.3s cubic-bezier(0.16, 1, 0.3, 1),
    border-radius  0.3s cubic-bezier(0.16, 1, 0.3, 1),
    box-shadow     0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

/* ── App bar: floating pill when page is scrolled ───────────────── */
.app-header--floating {
  top: 5px !important;
  inset-inline: 5px !important;
  width: auto !important;
  margin: 0 !important;
  border: 2px solid rgb(var(--v-border-color) / 0.20) !important;
  border-radius: 16px !important;
  box-shadow:
    0 2px 8px  rgb(0 0 0 / 0.08),
    0 8px 24px rgb(0 0 0 / 0.10) !important;
}

/* ── Mobile / Desktop visibility (CSS-only, no hydration flash) ── */
.app-header__mobile {
  display: none;
  padding-inline: 8px;
}

.app-header__desktop {
  display: flex;
}

@media (max-width: 920px) {
  .app-header__mobile  { display: flex; }
  .app-header__desktop { display: none; }
}

/* ── Mobile layout helpers ──────────────────────────────────────── */
.app-header__side {
  min-width: 75px;
  display: flex;
  justify-content: flex-start;
}

.app-header__actions {
  justify-content: flex-end;
  gap: 2px;
}

[dir="rtl"] .app-header__actions {
  justify-content: flex-start;
}

.app-header__mobile-logo {
  max-width: 100%;
}

/* ── Button text normalisation ──────────────────────────────────── */
.app-header__btn-text {
  text-transform: none !important;
  letter-spacing: 0 !important;
}

.app-header__nav-btn {
  text-transform: none !important;
  letter-spacing: 0 !important;
  font-weight: 500;
  white-space: nowrap;
}

.app-header__nav-btn.v-btn--active {
  color: rgb(var(--v-theme-primary));
  background-color: rgb(var(--v-theme-primary) / 0.10);
  font-weight: 600;
}

/* ── Dropdown list shadow + border ──────────────────────────────── */
.app-dropdown {
  border: 1px solid rgb(var(--v-border-color) / 0.12);
  box-shadow:
    0 4px 6px  rgb(0 0 0 / 0.06),
    0 12px 24px rgb(0 0 0 / 0.10) !important;
}

/* ── Glass background: fallback first, glass on @supports ── */
/* ── Header and Drawer ── */
.app-header,
#user-nav-drawer {
  background-color: rgb(var(--v-theme-surface) / 0.94);
}

@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .app-header,
  #user-nav-drawer {
    /* Define the filter ONCE as a custom property — Lightning CSS
       does not inline or strip var() references, so both prefixed
       and unprefixed lines survive the build. */
    --glass-filter: blur(20px) brightness(0.7);

    -webkit-backdrop-filter: var(--glass-filter);
    backdrop-filter: var(--glass-filter);

    background-color: rgb(var(--v-theme-surface) / 0.4);
  }
}

/* ── Light mode: saturate keeps colors alive ── */
@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .v-theme--light .app-header,
  .v-theme--light #user-nav-drawer {
    --glass-filter: blur(20px) saturate(180%);
    background-color: rgb(var(--v-theme-surface) / 0.7);
  }
}

/* ── Dark mode: brightness dims the backdrop ── */
@supports (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)) {
  .v-theme--dark .app-header,
  .v-theme--dark #user-nav-drawer {
    --glass-filter: blur(20px) brightness(0.7);
    background-color: rgb(var(--v-theme-surface) / 0.5);
  }
}
</style>
