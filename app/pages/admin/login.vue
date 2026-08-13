<script setup lang="ts">
const { t, locale, locales } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const { fetch: refreshSession } = useUserSession()
const route = useRoute()
const { isDark, toggleTheme } = useTheme()

const loading = ref(false)
const errorMessage = ref<string | null>(null)

const rtlLocales = ['ar', 'he', 'fa', 'ur']

const isRtl = computed(() => rtlLocales.includes(locale.value))
const backIcon = computed(() =>
  isRtl.value ? 'mdi-arrow-right' : 'mdi-arrow-left',
)
const themeIcon = computed(() =>
  isDark.value ? 'mdi-weather-sunny' : 'mdi-weather-night',
)
const themeLabel = computed(() =>
  isDark.value
    ? t('common.switchToLight', 'Switch to light mode')
    : t('common.switchToDark', 'Switch to dark mode'),
)

const localeOptions = computed(() =>
  locales.value.map(item => ({
    code: typeof item === 'string' ? item : item.code,
    name: typeof item === 'string' ? item : item.name,
  })),
)

/**
 * Only permit internal /admin destinations after authentication.
 * Locale prefixes are removed before validating then reapplied
 * using the currently active locale.
 */
function getSafeAdminRedirect(): string {
  const rawRedirect
    = typeof route.query.redirect === 'string' ? route.query.redirect : ''

  if (!rawRedirect.startsWith('/') || rawRedirect.startsWith('//')) {
    return localePath('/admin')
  }

  const url = new URL(rawRedirect, 'http://localhost')
  let path = url.pathname

  for (const { code } of localeOptions.value) {
    if (path === `/${code}` || path.startsWith(`/${code}/`)) {
      path = path.slice(code.length + 1) || '/'
      break
    }
  }

  const isAdminPath = path === '/admin' || path.startsWith('/admin/')

  return isAdminPath
    ? localePath(path)
    : localePath('/admin')
}

async function onLogin(credentials: { username: string, password: string }) {
  loading.value = true
  errorMessage.value = null

  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: credentials,
    })

    await refreshSession()
    await navigateTo(getSafeAdminRedirect())
  }
  catch (error) {
    errorMessage.value = getApiErrorMessage(
      error,
      t('auth.loginError'),
    )
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

async function switchLocale(code: string) {
  if (code === locale.value) return

  await navigateTo(switchLocalePath(code as 'fr' | 'ar'))
}

definePageMeta({
  layout: 'auth',
  middleware: ['admin-guest'],
})
</script>

<template>
  <div
    class="d-flex flex-column ga-1"
    :dir="isRtl ? 'rtl' : 'ltr'"
  >
    <header
      class="d-flex align-center justify-space-between"
      role="banner"
    >
      <v-btn
        :icon="backIcon"
        :aria-label="t('common.goBack', 'Go back')"
        variant="text"
        size="x-small"
        rounded="lg"
        @click="goBack"
      />

      <div class="d-flex align-center ga-2">
        <v-menu location="bottom end">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              icon="mdi-translate"
              :aria-label="t('common.language', 'Language')"
              :title="t('common.language', 'Language')"
              variant="text"
              size="x-small"
              rounded="lg"
            />
          </template>

          <v-list
            density="compact"
            rounded="lg"
          >
            <v-list-item
              v-for="item in localeOptions"
              :key="item.code"
              :title="item.name"
              :active="item.code === locale"
              @click="switchLocale(item.code)"
            >
              <template #append>
                <v-icon
                  v-if="item.code === locale"
                  color="primary"
                  icon="mdi-check"
                  size="18"
                />
              </template>
            </v-list-item>
          </v-list>
        </v-menu>

        <v-btn
          :icon="themeIcon"
          :aria-label="themeLabel"
          :title="themeLabel"
          variant="text"
          size="x-small"
          rounded="lg"
          @click="toggleTheme"
        />

        <v-btn
          icon="mdi-home-outline"
          :aria-label="t('common.home', 'Go to homepage')"
          :to="localePath('/')"
          variant="text"
          size="x-small"
          rounded="lg"
        />
      </div>
    </header>
    <AdminLoginForm
      :loading="loading"
      :error-message="errorMessage"
      @submit="onLogin"
    />
  </div>
</template>
