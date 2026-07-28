<script setup lang="ts">
/**
 * Dialog to change the login email. Requires the current password to
 * re-authenticate before the change is accepted.
 */
const props = defineProps<{
  currentEmail: string
  submit: (email: string, currentPassword: string) => Promise<void>
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const email = ref('')
const currentPassword = ref('')
const loading = ref(false)
const errorMessage = ref<string | null>(null)

const canSubmit = computed(() =>
  EMAIL_PATTERN.test(email.value.trim())
  && email.value.trim().toLowerCase() !== props.currentEmail.toLowerCase()
  && currentPassword.value.length > 0
  && !loading.value,
)

watch(open, (value) => {
  if (value) {
    email.value = props.currentEmail
    currentPassword.value = ''
    errorMessage.value = null
  }
})

async function onSubmit() {
  if (!canSubmit.value) return
  loading.value = true
  errorMessage.value = null
  try {
    await props.submit(email.value.trim(), currentPassword.value)
    open.value = false
  }
  catch (error) {
    errorMessage.value = extractErrorMessage(error, t('profile.emailError'))
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <v-dialog
    v-model="open"
    max-width="460"
  >
    <v-card rounded="lg">
      <v-card-title class="headline-small pt-4">
        {{ t('profile.changeEmail') }}
      </v-card-title>
      <v-card-text>
        <v-form @submit.prevent="onSubmit">
          <v-alert
            type="info"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            {{ t('profile.emailNotice') }}
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
            class="mb-2"
          />
          <v-text-field
            v-model="currentPassword"
            :label="t('profile.currentPassword')"
            type="password"
            prepend-inner-icon="mdi-lock-outline"
            variant="outlined"
            autocomplete="current-password"
          />
        </v-form>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn
          variant="text"
          @click="open = false"
        >
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          :disabled="!canSubmit"
          @click="onSubmit"
        >
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
