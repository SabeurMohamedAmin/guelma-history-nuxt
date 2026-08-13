<script setup lang="ts">
const { t, locale } = useI18n()
const localePath = useLocalePath()

const email = ref('')
const loading = ref(false)
const message = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

const canSubmit = computed(() => email.value.trim().length > 0 && !loading.value)

async function onSubmit() {
  if (!canSubmit.value) return
  loading.value = true
  message.value = null
  errorMessage.value = null

  try {
    const res = await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value.trim().toLowerCase() },
    })
    message.value = res.message
  }
  catch (error) {
    errorMessage.value = getApiErrorMessage(error, t('auth.resetRequestError'))
  }
  finally {
    loading.value = false
  }
}

definePageMeta({
  layout: 'auth',
  middleware: ['admin-guest'],
})

function goBack() {
  if (import.meta.client && window.history.length > 1) {
    window.history.back()
    return
  }

  navigateTo(localePath('/'))
}

const isRtl = computed(() =>
  ['ar', 'he', 'fa', 'ur'].includes(locale.value),
)
const backIcon = computed(() =>
  isRtl.value ? 'mdi-arrow-right' : 'mdi-arrow-left',
)
</script>

<template>
  <v-form @submit.prevent="onSubmit">
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

    <h1 class="text-headline-small font-weight-bold mb-1">
      {{ t('auth.forgotPassword') }}
    </h1>
    <p class="text-body-2 text-medium-emphasis mb-6">
      {{ t('auth.forgotPasswordHint') }}
    </p>

    <v-alert
      v-if="message"
      type="success"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      {{ message }}
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
      v-model="email"
      :label="t('auth.email')"
      type="email"
      prepend-inner-icon="mdi-email-outline"
      variant="outlined"
      autocomplete="email"
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
      {{ t('auth.sendResetLink') }}
    </v-btn>

    <div class="text-center mt-4">
      <NuxtLink
        :to="$localePath('/admin/login')"
        class="text-body-2 text-primary"
      >
        {{ t('auth.backToLogin') }}
      </NuxtLink>
    </div>
  </v-form>
</template>
