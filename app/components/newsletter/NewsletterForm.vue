<script setup lang="ts">
const { t } = useI18n()

const email = ref('')
const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const isEmailValid = computed(() => EMAIL_RE.test(email.value.trim()))
const canSubmit = computed(() => isEmailValid.value && !loading.value)

function resetMessages() {
  successMessage.value = ''
  errorMessage.value = ''
}

async function subscribe() {
  resetMessages()

  const normalizedEmail = email.value.trim().toLowerCase()

  if (!EMAIL_RE.test(normalizedEmail)) {
    errorMessage.value = t('newsletter.invalidEmail')
    return
  }

  loading.value = true

  try {
    await $fetch('/api/newsletter/subscribe', {
      method: 'POST',
      body: { email: normalizedEmail },
    })

    successMessage.value = t('newsletter.checkInbox')
    email.value = ''
  }
  catch (error) {
    const fetchError = error as { data?: { message?: string } }
    errorMessage.value = fetchError.data?.message || t('newsletter.error')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <v-sheet
    class="newsletter-form rounded-xl pa-2 pa-md-6 text-center"
    color="surface"
    border
  >
    <div class="newsletter-form__content mx-auto">
      <v-icon
        icon="mdi-email-newsletter"
        size="44"
        color="primary"
        class="mb-4"
      />

      <h2 class="text-headline-small text-md-h4 font-weight-bold mb-3">
        {{ t('newsletter.heading') }}
      </h2>

      <p class="text-body-1 text-medium-emphasis mb-6">
        {{ t('newsletter.subheading') }}
      </p>

      <v-form
        class="newsletter-form__fields"
        @submit.prevent="subscribe"
      >
        <v-text-field
          v-model="email"
          type="email"
          :label="t('newsletter.placeholder')"
          variant="outlined"
          density="comfortable"
          autocomplete="email"
          prepend-inner-icon="mdi-email-outline"
          :disabled="loading"
          :error="Boolean(errorMessage)"
          hide-details="auto"
          class="newsletter-form__input"
          @update:model-value="resetMessages"
        />

        <v-btn
          type="submit"
          color="primary"
          height="48"
          class="newsletter-form__button font-weight-bold rounded-lg"
          :loading="loading"
          :disabled="!canSubmit"
          elevation="2"
        >
          {{ t('newsletter.subscribe') }}
        </v-btn>
      </v-form>

      <v-alert
        v-if="successMessage"
        type="success"
        variant="tonal"
        density="comfortable"
        class="mt-5 text-start"
        role="status"
      >
        {{ successMessage }}
      </v-alert>

      <v-alert
        v-else-if="errorMessage"
        type="error"
        variant="tonal"
        density="comfortable"
        class="mt-5 text-start"
        role="alert"
      >
        {{ errorMessage }}
      </v-alert>

      <p class="text-caption text-medium-emphasis mt-5 mb-0">
        {{ t('newsletter.doubleOptInHint') }}
      </p>
    </div>
  </v-sheet>
</template>

<style scoped>
.newsletter-form {
  border: 1px solid rgba(var(--v-theme-primary), 0.14);
}

.newsletter-form__content {
  max-width: 640px;
}

.newsletter-form__fields {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.newsletter-form__button {
  width: 100%;
}

@media (min-width: 600px) {
  .newsletter-form__fields {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .newsletter-form__button {
    min-width: 150px;
    width: auto;
  }
}
</style>
