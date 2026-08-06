<script setup lang="ts">
const { t, locale, locales } = useI18n()
const localePath = useLocalePath()
const { fetch: refreshSession } = useUserSession()
const route = useRoute()

const loading = ref(false)
const errorMessage = ref<string | null>(null)

/**
 * Resolve a safe, locale-aware destination after login.
 *
 * The `redirect` query may already carry a locale prefix (e.g. /fr/admin/...)
 * because it comes from the route's fullPath. We strip any known locale prefix,
 * validate it points inside /admin (and is not a protocol-relative // URL),
 * then re-apply the active locale via localePath so the prefix is preserved.
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

const isRtl = computed(() =>
  ['ar', 'he', 'fa', 'ur'].includes(locale.value),
)
const backIcon = computed(() =>
  isRtl.value ? 'mdi-arrow-right' : 'mdi-arrow-left',
)
</script>

<template>
  <div class="admin-login-page">
    <section class="d-flex justify-space-between align-center">
      <v-btn
        variant="text"
        :icon="backIcon"
        class="rounded-lg"
        @click="goBack"
      />
      <v-btn
        variant="text"
        icon="mdi-home-outline"
        class="rounded-lg"
        :to="$localePath('/')"
      />
    </section>

    <admin-login-form
      :loading="loading"
      :error-message="errorMessage"
      @submit="onLogin"
    />
  </div>
</template>

<style scoped>
.admin-login-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
