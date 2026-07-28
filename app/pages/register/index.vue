<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()

// Go back to the previous page if there is in-app history, otherwise fall back
// to the home page (e.g. when the register page was opened directly).
function goBack() {
  if (window.history.length > 1) {
    router.back()
    return
  }
  navigateTo(localePath('/'))
}

const loading = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)

const username = ref('')
const email = ref('')
const password = ref('')
const showPassword = ref(false)

const canSubmit = computed(() =>
  username.value.trim().length > 0
  && email.value.trim().length > 0
  && password.value.length > 0
  && !loading.value,
)

// Flags set by the Facebook routes: an emailless FB account can never register,
// and the login route sends unknown visitors here to register.
const fbNoEmail = computed(() => route.query.error === 'fb-no-email')
const noAccount = computed(() => route.query.reason === 'no-account')

async function onRegister() {
  if (!canSubmit.value) return
  loading.value = true
  errorMessage.value = null
  successMessage.value = null

  try {
    const res = await $fetch('/api/auth/user/register', {
      method: 'POST',
      body: {
        username: username.value.trim().toLowerCase(),
        email: email.value.trim().toLowerCase(),
        password: password.value,
      },
    })
    // No auto-login: the account must verify its email first.
    successMessage.value = res.message
  }
  catch (error) {
    errorMessage.value = getErrorMessage(error, t('auth.registerError'))
  }
  finally {
    loading.value = false
  }
}

function registerWithFacebook() {
  window.location.href = '/api/auth/user/facebook/register'
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

    <v-form @submit.prevent="onRegister">
      <h1 class="text-headline-small font-weight-bold mb-1">
        {{ t('auth.register') }}
      </h1>
      <p class="text-body-2 text-medium-emphasis mb-6">
        {{ t('auth.registerSubtitle') }}
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
        v-if="fbNoEmail"
        type="warning"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        {{ t('auth.fbNoEmail') }}
      </v-alert>

      <v-alert
        v-if="successMessage"
        type="success"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        {{ successMessage }}
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

      <template v-if="!successMessage">
        <v-text-field
          v-model="username"
          :label="t('auth.username')"
          prepend-inner-icon="mdi-account-outline"
          variant="outlined"
          autocomplete="username"
          class="mb-2"
        />

        <v-text-field
          v-model="email"
          :label="t('auth.email')"
          type="email"
          prepend-inner-icon="mdi-email-outline"
          variant="outlined"
          autocomplete="email"
          class="mb-2"
        />

        <v-text-field
          v-model="password"
          :label="t('auth.password')"
          :type="showPassword ? 'text' : 'password'"
          prepend-inner-icon="mdi-lock-outline"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          variant="outlined"
          autocomplete="new-password"
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
          {{ t('auth.register') }}
        </v-btn>

        <v-btn
          variant="outlined"
          size="large"
          block
          prepend-icon="mdi-facebook"
          class="mb-4"
          @click="registerWithFacebook"
        >
          {{ t('auth.continueWithFacebook') }}
        </v-btn>
      </template>

      <p class="text-body-2 text-center">
        {{ t('auth.haveAccountQuestion') }}
        <NuxtLink :to="localePath('/login')">{{ t('auth.login') }}</NuxtLink>
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
