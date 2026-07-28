<script setup lang="ts">
import { ref, onMounted } from 'vue'

const { t } = useI18n()
const route = useRoute()

type State = 'loading' | 'success' | 'error'
const state = ref<State>('loading')
const serverMessage = ref('')

useSeoMeta({
  title: () => t('contact.verify.successTitle'),
})

definePageMeta({
  layout: 'default',
})

const verify = async () => {
  const token = route.query.token as string | undefined

  if (!token) {
    state.value = 'error'
    serverMessage.value = t('contact.verify.missingToken')
    return
  }

  try {
    await $fetch('/api/contact/verify', {
      method: 'POST',
      body: { token },
    })
    serverMessage.value = t('contact.verify.successMessage')
    state.value = 'success'
  }
  catch {
    serverMessage.value = t('contact.verify.failed')
    state.value = 'error'
  }
}

onMounted(verify)
</script>

<template>
  <v-container class="py-12">
    <v-row justify="center">
      <v-col
        cols="12"
        md="7"
        lg="5"
      >
        <v-sheet
          class="rounded-xl pa-8 text-center border"
          color="surface"
          border
        >
          <!-- Verifying -->
          <template v-if="state === 'loading'">
            <v-progress-circular
              indeterminate
              color="primary"
              size="48"
              class="mb-4"
            />
            <h2 class="text-headline-small font-weight-bold">
              {{ t('contact.verify.checking') }}
            </h2>
          </template>

          <!-- Success -->
          <template v-else-if="state === 'success'">
            <v-icon
              icon="mdi-check-circle-outline"
              size="64"
              color="success"
              class="mb-4"
            />
            <h2 class="text-headline-small font-weight-bold mb-3">
              {{ t('contact.verify.successTitle') }}
            </h2>
            <p class="text-body-1 text-medium-emphasis mb-6">
              {{ serverMessage }}
            </p>
            <v-btn
              color="primary"
              :to="$localePath('/')"
              class="rounded-lg font-weight-bold"
            >
              {{ t('contact.verify.backHome') }}
            </v-btn>
          </template>

          <!-- Error: invalid / expired token -->
          <template v-else>
            <v-icon
              icon="mdi-alert-circle-outline"
              size="64"
              color="error"
              class="mb-4"
            />
            <h2 class="text-headline-small font-weight-bold mb-3">
              {{ t('contact.verify.errorTitle') }}
            </h2>
            <p class="text-body-1 text-medium-emphasis mb-6">
              {{ serverMessage }}
            </p>
            <v-btn
              color="primary"
              :to="$localePath('/contact')"
              class="rounded-lg font-weight-bold"
            >
              {{ t('contact.verify.tryAgain') }}
            </v-btn>
          </template>
        </v-sheet>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
  .border { border: 1px solid rgba(255, 255, 255, 0.05); }
</style>
