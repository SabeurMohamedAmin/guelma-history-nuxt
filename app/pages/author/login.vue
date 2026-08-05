<script setup lang="ts">
const { t, locale, locales } = useI18n()
const localePath = useLocalePath()
const { fetch: refreshSession } = useUserSession()
const route = useRoute()

const loading = ref(false)
const errorMessage = ref<string | null>(null)

const identifier = ref('')
const password = ref('')
const showPassword = ref(false)

const canSubmit = computed(() =>
  identifier.value.trim().length > 0
  && password.value.length > 0
  && !loading.value,
)

function getSafeAuthorRedirect(): string {
  const raw = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  const localeCodes = locales.value.map(l => (typeof l === 'string' ? l : l.code))

  let path = raw

  for (const code of localeCodes) {
    if (path === `/${code}` || path.startsWith(`/${code}/`)) {
      path = path.slice(code.length + 1) || '/'
      break
    }
  }

  if (path.startsWith('/author') && !path.startsWith('//')) {
    return localePath(path)
  }

  return localePath('/author')
}

async function onLogin() {
  if (!canSubmit.value) return

  loading.value = true
  errorMessage.value = null

  try {
    await $fetch('/api/auth/author/login', {
      method: 'POST',
      body: {
        identifier: identifier.value.trim().toLowerCase(),
        password: password.value,
      },
    })

    await refreshSession()
    await navigateTo(getSafeAuthorRedirect())
  }
  catch (error) {
    errorMessage.value = getApiErrorMessage(error, t('auth.loginError'))
  }
  finally {
    loading.value = false
  }
}

function goHome() {
  return navigateTo(localePath('/'))
}

function goBack() {
  if (import.meta.client && window.history.length > 1) {
    // navigateTo() only accepts routes, so step back through the browser.
    window.history.back()
    return
  }

  return navigateTo(localePath('/'))
}

definePageMeta({
  layout: 'auth',
  middleware: ['author-guest'],
})

const isRtl = computed(() =>
  ['ar', 'he', 'fa', 'ur'].includes(locale.value),
)

const backIcon = computed(() =>
  isRtl.value ? 'mdi-arrow-right' : 'mdi-arrow-left',
)

const homeIcon = computed(() =>
  'mdi-home-outline',
)
</script>

<template>
  <div class="author-login-page">
    <section class="d-flex justify-space-between align-center ga-2 mb-8">
      <v-btn
        variant="plain"
        width="fit-content"
        :prepend-icon="backIcon"
        class="rounded-lg"
        @click="goBack"
      >
        {{ t('common.back') }}
      </v-btn>

      <v-btn
        variant="plain"
        :prepend-icon="homeIcon"
        class="rounded-lg"
        @click="goHome"
      >
        {{ t('nav.home') }}
      </v-btn>
    </section>

    <v-form @submit.prevent="onLogin">
      <h1 class="text-headline-small font-weight-bold mb-1">
        {{ t('author.loginTitle') }}
      </h1>

      <p class="text-body-2 text-medium-emphasis mb-6">
        {{ t('author.loginSubtitle') }}
      </p>

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        {{ errorMessage }}
      </v-alert>

      <v-text-field
        v-model="identifier"
        :label="t('auth.username')"
        prepend-inner-icon="mdi-account-outline"
        variant="outlined"
        autocomplete="username"
        class="mb-2"
      />

      <v-text-field
        v-model="password"
        :label="t('auth.password')"
        :type="showPassword ? 'text' : 'password'"
        prepend-inner-icon="mdi-lock-outline"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        variant="outlined"
        autocomplete="current-password"
        class="mb-4"
        @click:append-inner="showPassword = !showPassword"
      />

      <v-btn
        type="submit"
        color="primary"
        size="large"
        block
        :loading="loading"
        :disabled="!canSubmit"
      >
        {{ t('auth.login') }}
      </v-btn>
    </v-form>
  </div>
</template>

<style scoped>
.author-login-page {
  width: 100%;
}
</style>
