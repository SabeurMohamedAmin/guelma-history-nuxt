<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { fetch: refreshSession } = useUserSession()

const status = ref<'verifying' | 'success' | 'error'>('verifying')
const errorMessage = ref<string | null>(null)

async function verify() {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token) {
    status.value = 'error'
    errorMessage.value = t('auth.verifyMissingToken')
    return
  }

  try {
    await $fetch('/api/auth/user/verify-email', { method: 'POST', body: { token } })
    await refreshSession()
    status.value = 'success'
    // Brief confirmation, then send the now-verified, logged-in user home.
    setTimeout(() => navigateTo(localePath('/')), 1500)
  }
  catch (error) {
    status.value = 'error'
    errorMessage.value = getErrorMessage(error, t('auth.verifyError'))
  }
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }
  return fallback
}

onMounted(verify)

definePageMeta({
  layout: 'auth',
})
</script>

<template>
  <div class="user-auth-page text-center">
    <template v-if="status === 'verifying'">
      <v-progress-circular
        indeterminate
        color="primary"
        class="mb-4"
      />
      <p class="text-body-1">
        {{ t('auth.verifying') }}
      </p>
    </template>

    <template v-else-if="status === 'success'">
      <v-icon
        icon="mdi-check-circle"
        color="success"
        size="48"
        class="mb-4"
      />
      <h1 class="text-headline-small font-weight-bold">
        {{ t('auth.verifySuccess') }}
      </h1>
    </template>

    <template v-else>
      <v-icon
        icon="mdi-alert-circle"
        color="error"
        size="48"
        class="mb-4"
      />
      <p class="text-body-1 mb-4">
        {{ errorMessage }}
      </p>
      <v-btn
        :to="localePath('/register')"
        color="primary"
        variant="tonal"
      >
        {{ t('auth.register') }}
      </v-btn>
    </template>
  </div>
</template>

<style scoped>
.user-auth-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}
</style>
