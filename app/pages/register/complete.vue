<script setup lang="ts">
// Page: /register/complete
// Shown after an OAuth (Facebook) sign-up so the user can pick a username and
// set a password before the account can be used with the form login.
//
// The backend endpoint POST /api/auth/user/complete-profile only accepts a
// `username` and a `password` (see completeProfileSchema), so this page keeps
// the form intentionally small and focused.

const { t } = useI18n()
const localePath = useLocalePath()
const router = useRouter()
const { fetch: refreshSession, user } = useUserSession()
const auth = useAuthStore()

definePageMeta({
  layout: 'auth',
  middleware: ['uncomplete-user'],
})

// UI state
const saving = ref(false)
const errorMessage = ref<string | null>(null)
const showPassword = ref(false)
const showConfirmPassword = ref(false)

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
const usernameTooShort = computed(() =>
  form.username.length > 0 && form.username.trim().length < 3,
)

const passwordTooShort = computed(() =>
  form.password.length > 0 && form.password.length < 8,
)

const passwordMismatch = computed(() =>
  form.confirmPassword.length > 0 && form.password !== form.confirmPassword,
)

const canSubmit = computed(() =>
  form.username.trim().length >= 3
  && form.password.length >= 8
  && !passwordMismatch.value
  && !saving.value,
)

async function onSubmit() {
  if (!canSubmit.value) return

  saving.value = true
  errorMessage.value = null

  try {
    await $fetch('/api/auth/user/complete-profile', {
      method: 'POST',
      body: {
        username: form.username.trim().toLowerCase(),
        password: form.password,
      },
    })

    // Refresh the client session so it reflects the new username and the
    // now-completed profile, then send the user back to the home page.
    await refreshSession()
    router.push(localePath('/'))
  }
  catch (error) {
    errorMessage.value = getErrorMessage(error, t('auth.completeError'))
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
  router.push(localePath('/'))
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }

  return fallback
}
</script>

<template>
  <div class="complete-profile-page">
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
        :error="usernameTooShort"
        :error-messages="usernameTooShort ? t('auth.usernameMinLength') : ''"
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
        :error="passwordTooShort"
        :error-messages="passwordTooShort ? t('auth.passwordHint') : ''"
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
