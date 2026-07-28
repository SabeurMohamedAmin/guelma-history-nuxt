<script setup lang="ts">
type UnsubscribeState = 'loading' | 'success' | 'error'

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()

const state = ref<UnsubscribeState>('loading')
const serverMessage = ref('')

useSeoMeta({
  title: () => t('newsletter.unsubscribe.successTitle'),
})

const token = computed(() => {
  const value = route.query.token
  return typeof value === 'string' ? value : ''
})

const isSuccess = computed(() => state.value === 'success')
const title = computed(() => {
  if (state.value === 'loading') return t('newsletter.unsubscribe.checking')
  return isSuccess.value ? t('newsletter.unsubscribe.successTitle') : t('newsletter.unsubscribe.errorTitle')
})

async function unsubscribeFromNewsletter() {
  if (!token.value) {
    state.value = 'error'
    serverMessage.value = t('newsletter.unsubscribe.missingToken')
    return
  }

  try {
    const response = await $fetch<{ message: string }>('/api/newsletter/unsubscribe', {
      method: 'POST',
      body: { token: token.value },
    })

    serverMessage.value = response.message
    state.value = 'success'
  }
  catch (error) {
    const fetchError = error as { data?: { message?: string } }
    serverMessage.value = fetchError.data?.message || t('newsletter.unsubscribe.failed')
    state.value = 'error'
  }
}

onMounted(unsubscribeFromNewsletter)

definePageMeta({
  layout: 'default',
})
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
          class="newsletter-unsubscribe rounded-xl pa-8 text-center"
          color="surface"
          border
        >
          <v-progress-circular
            v-if="state === 'loading'"
            indeterminate
            color="primary"
            size="56"
            class="mb-5"
          />

          <v-icon
            v-else
            :icon="isSuccess ? 'mdi-email-off-outline' : 'mdi-alert-circle-outline'"
            size="64"
            :color="isSuccess ? 'success' : 'error'"
            class="mb-5"
          />

          <h1 class="text-headline-small font-weight-bold mb-3">
            {{ title }}
          </h1>

          <p
            v-if="serverMessage"
            class="text-body-1 text-medium-emphasis mb-6"
          >
            {{ serverMessage }}
          </p>

          <div
            v-if="state !== 'loading'"
            class="d-flex flex-column flex-sm-row justify-center ga-3"
          >
            <v-btn
              color="primary"
              :to="localePath('/')"
              class="rounded-lg font-weight-bold"
            >
              {{ t('newsletter.unsubscribe.backHome') }}
            </v-btn>

            <v-btn
              v-if="isSuccess"
              variant="outlined"
              color="primary"
              :to="localePath('/') + '#newsletter'"
              class="rounded-lg font-weight-bold"
            >
              {{ t('newsletter.unsubscribe.subscribeAgain') }}
            </v-btn>
          </div>
        </v-sheet>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.newsletter-unsubscribe {
  border: 1px solid rgba(var(--v-theme-primary), 0.14);
}
</style>
