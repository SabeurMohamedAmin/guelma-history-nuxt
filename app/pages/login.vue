<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { fetch: refreshSession } = useUserSession()
const route = useRoute()
const router = useRouter()

// Go back to the previous page if there is in-app history, otherwise fall back
// to the home page (e.g. when the login page was opened directly).
function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  navigateTo(localePath('/'))
}

const loading = ref(false)
const errorMessage = ref<string | null>(null)

const identifier = ref('')
const password = ref('')
const showPassword = ref(false)

const canSubmit = computed(() =>
  identifier.value.trim().length > 0 && password.value.length > 0 && !loading.value,
)

// The Facebook-login route redirects an unknown visitor here with this flag so
// we can tell them they have no account yet and should register.
const noAccount = computed(() => route.query.reason === 'no-account')

async function onLogin() {
  if (!canSubmit.value) return
  loading.value = true
  errorMessage.value = null

  try {
    await $fetch('/api/auth/user/login', {
      method: 'POST',
      body: { identifier: identifier.value.trim().toLowerCase(), password: password.value },
    })
    await refreshSession()
    // Honour an optional redirect target (set by the user-only guard),
    // otherwise send the user to their own profile area.
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null
    await navigateTo(redirect ?? localePath('/'))
  }
  catch (error) {
    errorMessage.value = getErrorMessage(error, t('auth.loginError'))
  }
  finally {
    loading.value = false
  }
}

/** Full reload: OAuth is a server redirect flow, not an SPA navigation. */
function loginWithFacebook() {
  window.location.href = '/api/auth/user/facebook/login'
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  return fallback
}

definePageMeta({
  layout: 'auth',
  middleware: ['user-guest'],
})
</script>

<template>
  <div class="user-auth-page">
    <!-- Top navigation: go back to the previous page or jump home -->
    <nav class="d-flex align-center justify-space-between">
      <v-btn
        variant="text"
        size="small"
        prepend-icon="mdi-arrow-left"
        @click="goBack"
      >
        {{ t('common.back') }}
      </v-btn>
      <v-btn
        variant="text"
        size="small"
        prepend-icon="mdi-home-outline"
        :to="localePath('/')"
      >
        {{ t('nav.home') }}
      </v-btn>
    </nav>

    <v-form @submit.prevent="onLogin">
      <h1 class="text-headline-small font-weight-bold mb-1">
        {{ t('auth.login') }}
      </h1>
      <p class="text-body-2 text-medium-emphasis mb-6">
        {{ t('auth.userLoginSubtitle') }}
      </p>

      <v-alert
        v-if="noAccount"
        type="info"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        {{ t('auth.noAccountRegister') }}
      </v-alert>

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
        :label="t('auth.usernameOrEmail')"
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
        class="mb-3"
      >
        {{ t('auth.login') }}
      </v-btn>

      <v-btn
        variant="outlined"
        size="large"
        block
        prepend-icon="mdi-facebook"
        class="mb-4"
        @click="loginWithFacebook"
      >
        {{ t('auth.continueWithFacebook') }}
      </v-btn>

      <p class="text-body-2 text-center">
        {{ t('auth.noAccountQuestion') }}
        <NuxtLink :to="localePath('/register')">{{ t('auth.register') }}</NuxtLink>
      </p>
    </v-form>
  </div>
</template>

<style scoped>
.user-auth-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
