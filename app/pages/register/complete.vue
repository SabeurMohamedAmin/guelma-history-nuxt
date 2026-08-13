<script setup lang="ts">
// Page: /register/complete
// Shown after an OAuth (Facebook) sign-up so the user can pick a username and
// set a password before the account can be used with the form login.
//
// After a successful submission the server sends a verification email and
// clears the session. This page then shows a "check your inbox" state so the
// user knows what to do next.

const { t } = useI18n()
const localePath = useLocalePath()
const { fetch: refreshSession, user } = useUserSession()
const auth = useAuthStore()

definePageMeta({
  layout: 'auth',
  middleware: ['uncomplete-user'],
})

// UI state
const saving = ref(false)
const errorMessage = ref<string | null>(null)
const fieldErrors = reactive<Partial<Record<'username' | 'password', string>>>({})
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// True once the server has sent the verification email and cleared the session.
const verificationSent = ref(false)

// Form fields
const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
})

// First letter of the username, used as a fallback avatar.
const avatarInitial = computed(() =>
  (form.username.trim() || user.value?.username || '?').charAt(0).toUpperCase(),
)

// Validation rules mirror the server-side schema so the user gets instant
// feedback before submitting.
const usernameError = computed(() => {
  const username = form.username.trim()

  if (!username) return fieldErrors.username ?? ''
  if (username.length < 3) return t('auth.usernameMinLength')
  if (username.length > 30) return 'Username must be at most 30 characters'
  if (!/^[a-z0-9_.]+$/i.test(username)) {
    return 'Username may only contain letters, numbers, dot and underscore'
  }

  return fieldErrors.username ?? ''
})

const passwordTooShort = computed(() =>
  form.password.length > 0 && form.password.length < 8,
)

const passwordMismatch = computed(() =>
  form.confirmPassword.length > 0 && form.password !== form.confirmPassword,
)

const canSubmit = computed(() =>
  form.username.trim().length >= 3
  && form.username.trim().length <= 30
  && /^[a-z0-9_.]+$/i.test(form.username.trim())
  && form.password.length >= 8
  && form.password.length <= 200
  && !passwordMismatch.value
  && !saving.value,
)

watch(() => form.username, () => {
  fieldErrors.username = undefined
})

watch(() => form.password, () => {
  fieldErrors.password = undefined
})

async function onSubmit() {
  if (!canSubmit.value) return

  saving.value = true
  errorMessage.value = null
  fieldErrors.username = undefined
  fieldErrors.password = undefined

  try {
    const res = await $fetch<{ verificationEmailSent?: boolean }>(
      '/api/auth/user/complete-profile',
      {
        method: 'POST',
        body: {
          username: form.username.trim().toLowerCase(),
          password: form.password,
        },
      },
    )

    if (res.verificationEmailSent) {
      // Server cleared the session — refresh the client state then show the
      // "check your inbox" screen. No redirect: the user must verify first.
      await refreshSession()
      verificationSent.value = true
      return
    }

    // Edge case: already-verified account — refresh session and go home.
    await refreshSession()
    navigateTo(localePath('/'))
  }
  catch (error) {
    const response = getErrorResponse(error)
    errorMessage.value = response?.message ?? t('auth.completeError')
    fieldErrors.username = response?.errors?.username
    fieldErrors.password = response?.errors?.password
  }
  finally {
    saving.value = false
  }
}

// Log the user out and return to the home page. This page is the only screen
// shown to an OAuth user with an unfinished profile, so we expose logout here
// to let them leave without completing the form.
async function onLogout() {
  await auth.clear()
  navigateTo(localePath('/'))
}

interface CompleteProfileErrorResponse {
  message?: string
  errors?: Partial<Record<'username' | 'password', string>>
}

function getErrorResponse(error: unknown): CompleteProfileErrorResponse | null {
  if (!error || typeof error !== 'object' || !('data' in error)) return null

  return (error as { data?: CompleteProfileErrorResponse }).data ?? null
}
</script>

<template>
  <div class="complete-profile-page">
    <!-- ── Check-your-inbox state ─────────────────────────────────────── -->
    <template v-if="verificationSent">
      <div class="text-center">
        <v-icon
          icon="mdi-email-check-outline"
          size="64"
          color="primary"
          class="mb-4"
        />

        <h1 class="text-headline-small font-weight-bold mb-2">
          {{ t('auth.verifyEmailTitle') }}
        </h1>

        <p class="text-body-2 text-medium-emphasis mb-6">
          {{ t('auth.verifyEmailHint') }}
        </p>

        <v-btn
          variant="text"
          :to="localePath('/login')"
          prepend-icon="mdi-login"
        >
          {{ t('auth.backToLogin') }}
        </v-btn>
      </div>
    </template>

    <!-- ── Profile-completion form ────────────────────────────────────── -->
    <template v-else>
      <v-form @submit.prevent="onSubmit">
        <!-- Header: avatar + title + subtitle -->
        <div class="text-center mb-6">
          <v-avatar
            size="72"
            color="primary"
            class="complete-avatar mb-4"
          >
            <span class="text-headline-small font-weight-bold">
              {{ avatarInitial }}
            </span>
          </v-avatar>

          <h1 class="text-headline-small font-weight-bold mb-1">
            {{ t('auth.completeTitle') }}
          </h1>

          <p class="text-body-2 text-medium-emphasis">
            {{ t('auth.completeSubtitle') }}
          </p>
        </div>

        <!-- Error feedback -->
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          density="compact"
          class="mb-4"
        >
          {{ errorMessage }}
        </v-alert>

        <!-- Username -->
        <v-text-field
          v-model="form.username"
          :label="t('auth.username')"
          prepend-inner-icon="mdi-account-outline"
          variant="outlined"
          autocomplete="username"
          class="mb-2"
          :error="Boolean(usernameError)"
          :error-messages="usernameError"
        />

        <!-- Password -->
        <v-text-field
          v-model="form.password"
          :label="t('auth.newPassword')"
          :type="showPassword ? 'text' : 'password'"
          prepend-inner-icon="mdi-lock-outline"
          :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
          variant="outlined"
          autocomplete="new-password"
          class="mb-2"
          :error="passwordTooShort || Boolean(fieldErrors.password)"
          :error-messages="fieldErrors.password || (passwordTooShort ? t('auth.passwordHint') : '')"
          :hint="t('auth.passwordHint')"
          persistent-hint
          @click:append-inner="showPassword = !showPassword"
        />

        <!-- Confirm password -->
        <v-text-field
          v-model="form.confirmPassword"
          :label="t('auth.confirmPassword')"
          :type="showConfirmPassword ? 'text' : 'password'"
          prepend-inner-icon="mdi-lock-check-outline"
          :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
          variant="outlined"
          autocomplete="new-password"
          class="mb-4"
          :error="passwordMismatch"
          :error-messages="passwordMismatch ? t('auth.passwordsDoNotMatch') : ''"
          @click:append-inner="showConfirmPassword = !showConfirmPassword"
        />

        <!-- Actions -->
        <v-btn
          type="submit"
          color="primary"
          size="large"
          block
          :loading="saving"
          :disabled="!canSubmit"
          class="mb-3"
        >
          {{ t('auth.finishSetup') }}
        </v-btn>

        <v-btn
          variant="text"
          block
          prepend-icon="mdi-logout"
          @click="onLogout"
        >
          {{ t('auth.logout') }}
        </v-btn>
      </v-form>
    </template>
  </div>
</template>

<style scoped>
.complete-profile-page {
  width: 100%;
}

.complete-avatar {
  box-shadow: 0 10px 30px rgba(var(--v-theme-primary), 0.2);
}
</style>
