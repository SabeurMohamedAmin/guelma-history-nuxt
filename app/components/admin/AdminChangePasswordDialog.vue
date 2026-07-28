<script setup lang="ts">
/**
 * Dialog to change the password. Owns its form state only; the parent passes
 * a `submit` handler that performs the request and may throw to show an error.
 *
 * Changing the password re-stamps `passwordChangedAt` on the server, which the
 * session staleness check uses to invalidate every OTHER session while keeping
 * the acting one signed in. We tell the user that up front (info alert) and
 * confirm it afterwards (success step) so the side effect is never a surprise.
 */
const props = defineProps<{
  submit: (currentPassword: string, newPassword: string) => Promise<void>
}>()

const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const MIN_LENGTH = 8

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const showPasswords = ref(false)
const loading = ref(false)
const errorMessage = ref<string | null>(null)
// Once true, the dialog shows the success confirmation instead of the form.
const done = ref(false)

const canSubmit = computed(() =>
  currentPassword.value.length > 0
  && newPassword.value.length >= MIN_LENGTH
  && newPassword.value === confirmPassword.value
  && !loading.value,
)

watch(open, (value) => {
  if (!value) reset()
})

function reset() {
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  errorMessage.value = null
  showPasswords.value = false
  done.value = false
}

async function onSubmit() {
  if (!canSubmit.value) return
  loading.value = true
  errorMessage.value = null
  try {
    await props.submit(currentPassword.value, newPassword.value)
    // Show the confirmation step instead of closing immediately, so the user
    // sees that other sessions were signed out and this one was kept.
    done.value = true
  }
  catch (error) {
    errorMessage.value = extractErrorMessage(error, t('profile.passwordError'))
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
      <!-- Success confirmation step -->
      <template v-if="done">
        <v-card-text class="text-center pt-6">
          <v-avatar
            size="56"
            color="success"
            variant="tonal"
            class="mb-3"
          >
            <v-icon
              icon="mdi-check"
              size="32"
            />
          </v-avatar>
          <h3 class="text-headline-small font-weight-bold mb-1">
            {{ t('profile.passwordUpdated') }}
          </h3>
          <p class="text-body-2 text-medium-emphasis mb-0">
            {{ t('profile.passwordChangedLoggedOutOthers') }}
          </p>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn
            color="primary"
            variant="flat"
            @click="open = false"
          >
            {{ t('common.back') }}
          </v-btn>
        </v-card-actions>
      </template>

      <!-- Form step -->
      <template v-else>
        <v-card-title class="text-headline-small pt-4">
          {{ t('profile.changePassword') }}
        </v-card-title>
        <v-card-text>
          <v-form @submit.prevent="onSubmit">
            <v-alert
              type="info"
              variant="tonal"
              density="compact"
              class="mb-4"
            >
              {{ t('profile.passwordLogoutNotice') }}
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
              v-model="currentPassword"
              :label="t('profile.currentPassword')"
              :type="showPasswords ? 'text' : 'password'"
              prepend-inner-icon="mdi-lock-outline"
              variant="outlined"
              autocomplete="current-password"
              class="mb-2"
            />
            <v-text-field
              v-model="newPassword"
              :label="t('auth.newPassword')"
              :type="showPasswords ? 'text' : 'password'"
              prepend-inner-icon="mdi-lock-plus-outline"
              :append-inner-icon="showPasswords ? 'mdi-eye-off' : 'mdi-eye'"
              variant="outlined"
              autocomplete="new-password"
              :hint="t('auth.passwordHint')"
              persistent-hint
              class="mb-2"
              @click:append-inner="showPasswords = !showPasswords"
            />
            <v-text-field
              v-model="confirmPassword"
              :label="t('auth.confirmPassword')"
              :type="showPasswords ? 'text' : 'password'"
              prepend-inner-icon="mdi-lock-check-outline"
              variant="outlined"
              autocomplete="new-password"
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
      </template>
    </v-card>
  </v-dialog>
</template>
