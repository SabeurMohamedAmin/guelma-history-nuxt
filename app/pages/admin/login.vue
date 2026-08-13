<script setup lang="ts">
const { t, locale, locales } = useI18n()
const localePath = useLocalePath()
const { fetch: refreshSession } = useUserSession()
const route = useRoute()
const { isDark, toggleTheme } = useTheme()

const loading = ref(false)
const errorMessage = ref<string | null>(null)

/**
 * Resolve a safe, locale-aware destination after login.
 * Strips any known locale prefix from the `redirect` query param,
 * validates it points inside /admin, then re-applies the active locale.
 */
function getSafeAdminRedirect(): string {
  const raw = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  const localeCodes = locales.value.map(l => (typeof l === 'string' ? l : l.code))

  let path = raw
  for (const code of localeCodes) {
    if (path === `/${code}` || path.startsWith(`/${code}/`)) {
      path = path.slice(code.length + 1) || '/'
      break
    }
  }

  if (path.startsWith('/admin') && !path.startsWith('//')) {
    return localePath(path)
  }
  return localePath('/admin')
}

async function onLogin(credentials: { username: string, password: string }) {
  loading.value = true
  errorMessage.value = null
  try {
    await $fetch('/api/auth/login', { method: 'POST', body: credentials })
    await refreshSession()
    await navigateTo(getSafeAdminRedirect())
  }
  catch (error) {
    errorMessage.value = getApiErrorMessage(error, t('auth.loginError'))
  }
  finally {
    loading.value = false
  }
}

function goBack() {
  if (import.meta.client && window.history.length > 1) {
    window.history.back()
    return
  }
  return navigateTo(localePath('/'))
}

definePageMeta({
  layout: 'auth',
  middleware: ['admin-guest'],
})

const isRtl = computed(() => ['ar', 'he', 'fa', 'ur'].includes(locale.value))
const backIcon = computed(() => (isRtl.value ? 'mdi-arrow-right' : 'mdi-arrow-left'))
const themeIcon = computed(() => (isDark.value ? 'mdi-weather-sunny' : 'mdi-weather-night'))
const themeLabel = computed(() =>
  isDark.value ? t('common.switchToLight', 'Switch to light mode') : t('common.switchToDark', 'Switch to dark mode'),
)

const switchLocalePath = useSwitchLocalePath()

async function switchLocale(code: string) {
  if (code === locale.value) return

  await navigateTo(switchLocalePath(code as 'fr' | 'ar'))
}
</script>

<template>
  <div
    class="login-page"
    :dir="isRtl ? 'rtl' : 'ltr'"
  >
    <!-- ── Top navigation bar ── -->
    <header
      class="login-page__nav"
      role="banner"
    >
      <!-- Back button -->
      <v-btn
        variant="text"
        :icon="backIcon"
        size="x-small"
        rounded="lg"
        class="text-body-small"
        :aria-label="t('common.goBack', 'Go back')"
        @click="goBack"
      />

      <!-- Right-side actions -->
      <div class="d-flex align-center gap-2">
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              variant="text"
              size="x-small"
              rounded="lg"
              class="text-body-small"
              icon="mdi-translate"
              :aria-label="t('common.language', 'Language')"
              :title="t('common.language', 'Language')"
            />
          </template>

          <v-list density="compact">
            <v-list-item
              v-for="item in locales"
              :key="typeof item === 'string' ? item : item.code"
              :active="(typeof item === 'string' ? item : item.code) === locale
              "
              @click="
                switchLocale(
                  typeof item === 'string' ? item : item.code,
                )
              "
            >
              <v-list-item-title>
                {{ typeof item === 'string' ? item : item.name }}
              </v-list-item-title>

              <template #append>
                <v-icon
                  v-if="
                    (typeof item === 'string' ? item : item.code) === locale
                  "
                  color="primary"
                  size="18"
                >
                  mdi-check
                </v-icon>
              </template>
            </v-list-item>
          </v-list>
        </v-menu>
        <!-- Theme toggle -->
        <v-btn
          variant="text"
          :icon="themeIcon"
          size="x-small"
          class="text-body-small mx-2"
          rounded="lg"
          :aria-label="themeLabel"
          :title="themeLabel"
          @click="toggleTheme"
        />

        <!-- Home -->
        <v-btn
          variant="text"
          icon="mdi-home-outline"
          size="x-small"
          class="text-body-small"
          rounded="lg"
          :aria-label="t('common.home', 'Go to homepage')"
          :to="$localePath('/')"
        />
      </div>
    </header>

    <!-- ── Brand / logo area ── -->
    <header
      class="login-page__brand"
      aria-label="Admin portal branding"
    >
      <div class="login-page__badge">
        <v-icon
          size="14"
          color="primary"
        >
          mdi-shield-check-outline
        </v-icon>
        <span class="text-caption text-primary font-weight-medium">
          {{ t('auth.adminAccess', 'Accès administrateur') }}
        </span>
      </div>

      <h1 class="login-page__title text-h5 font-weight-bold mt-3">
        {{ t('auth.loginTitle', 'Connexion à votre espace') }}
        <span class="text-primary">{{ t('auth.administrator', 'administrateur') }}</span>
      </h1>

      <p class="login-page__subtitle text-body-2 text-medium-emphasis mt-2">
        {{ t('auth.loginSubtitle', 'Gérez le contenu historique de Guelma en toute sécurité.') }}
      </p>
    </header>

    <!-- ── Login form ── -->
    <main role="main">
      <AdminLoginForm
        :loading="loading"
        :error-message="errorMessage"
        @submit="onLogin"
      />
    </main>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Navigation row */
.login-page__nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Badge pill above title */
.login-page__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(var(--v-theme-primary), 0.1);
  border: 1px solid rgba(var(--v-theme-primary), 0.25);
  width: fit-content;
}

/* Page heading */
.login-page__title {
  line-height: 1.3;
}

/* Features list */
.login-page__features {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.login-page__feature-item {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
}

.login-page__language-btn {
  min-width: 0;
  padding-inline: 8px;
}

.login-page__language-menu {
  border-radius: 12px;
}

.login-page__locale-placeholder {
  display: inline-block;
  width: 16px;
}
</style>
