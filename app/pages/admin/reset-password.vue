<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()

const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))

const password = ref('')
const confirm = ref('')
const showPassword = ref(false)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
const done = ref(false)

const MIN_LENGTH = 8
const canSubmit = computed(() =>
  password.value.length >= MIN_LENGTH && password.value === confirm.value && !loading.value,
)

async function onSubmit() {
  if (!canSubmit.value) return
  loading.value = true
  errorMessage.value = null

  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { token: token.value, password: password.value },
    })
    done.value = true
  }
  catch (error) {
    errorMessage.value = getApiErrorMessage(error, t('auth.resetError'))
  }
  finally {
    loading.value = false
  }
}

definePageMeta({
  layout: 'auth',
  middleware: ['admin-guest'],
})
</script>

<template>
  <div>
    <h1 class="text-headline-small font-weight-bold mb-1">
      {{ t('auth.resetPassword') }}
    </h1>

    <!-- Missing token -->
    <v-alert
      v-if="!token"
      type="error"
      variant="tonal"
      density="compact"
      class="mt-4"
    >
      {{ t('auth.resetError') }}
    </v-alert>

    <!-- Success -->
    <template v-else-if="done">
      <v-alert
        type="success"
        variant="tonal"
        density="compact"
        class="my-4"
      >
        {{ t('auth.resetSuccess') }}
      </v-alert>
      <v-btn
        :to="$localePath('/admin/login')"
        color="primary"
        block
      >
        {{ t('auth.login') }}
      </v-btn>
    </template>

    <!-- Form -->
    <v-form
      v-else
      class="mt-4"
      @submit.prevent="onSubmit"
    >
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
        v-model="password"
        :label="t('auth.newPassword')"
        :type="showPassword ? 'text' : 'password'"
        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
        prepend-inner-icon="mdi-lock-outline"
        variant="outlined"
        autocomplete="new-password"
        :hint="t('auth.passwordHint')"
        persistent-hint
        class="mb-3"
        @click:append-inner="showPassword = !showPassword"
      />

      <v-text-field
        v-model="confirm"
        :label="t('auth.confirmPassword')"
        :type="showPassword ? 'text' : 'password'"
        prepend-inner-icon="mdi-lock-check-outline"
        variant="outlined"
        autocomplete="new-password"
        class="mb-4"
      />

      <v-btn
        type="submit"
        color="primary"
        size="large"
        block
        :loading="loading"
        :disabled="!canSubmit"
      >
        {{ t('auth.resetPassword') }}
      </v-btn>
    </v-form>
  </div>
</template>
