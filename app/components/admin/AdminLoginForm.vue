<script setup lang="ts">
/**
 * Presentational login form. Owns only its own input state and validation,
 * and emits the credentials upward — the page handles the actual request.
 */
const props = defineProps<{
  loading?: boolean
  errorMessage?: string | null
}>()

const emit = defineEmits<{
  submit: [credentials: { username: string, password: string }]
}>()

const username = ref('')
const password = ref('')
const showPassword = ref(false)

const canSubmit = computed(() =>
  username.value.trim().length > 0 && password.value.length > 0 && !props.loading,
)

function onSubmit() {
  if (!canSubmit.value) return
  // Usernames are case-insensitive and stored lowercased, so normalize here to
  // match the server.
  emit('submit', { username: username.value.trim().toLowerCase(), password: password.value })
}
</script>

<template>
  <v-form @submit.prevent="onSubmit">
    <header
      class="d-flex flex-column align-start my-2"
      :aria-label="$t('auth.adminAccess', 'Admin portal branding')"
    >
      <v-chip
        color="primary"
        variant="tonal"
        size="small"
        prepend-icon="mdi-shield-check-outline"
        class="text-label-small"
      >
        {{ $t('auth.adminAccess', 'Accès administrateur') }}
      </v-chip>

      <h1 class="text-title-medium text-md-title-large font-weight-bold mt-2 mb-0">
        {{ $t('auth.loginTitle', 'Connexion à votre espace') }}
        <span class="text-primary">
          {{ $t('auth.administrator', 'administrateur') }}
        </span>
      </h1>

      <p class="text-body-small text-md-body-medium text-medium-emphasis mt-1 mb-0">
        {{ $t('auth.loginSubtitle', 'Gérez le contenu historique de Guelma en toute sécurité.') }}
      </p>
    </header>
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
      v-model="username"
      :label="$t('auth.username')"
      prepend-inner-icon="mdi-account-outline"
      variant="outlined"
      autocomplete="username"
      class="mb-2"
    />

    <v-text-field
      v-model="password"
      :label="$t('auth.password')"
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
      {{ $t('auth.login') }}
    </v-btn>

    <div class="text-center mt-4">
      <NuxtLink
        :to="$localePath('/admin/forgot-password')"
        class="text-body-2 text-primary"
      >
        {{ $t('auth.forgotPassword') }}
      </NuxtLink>
    </div>
  </v-form>
</template>
