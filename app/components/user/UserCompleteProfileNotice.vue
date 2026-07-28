<script setup lang="ts">
/**
 * Persistent "complete your profile" notice.
 *
 * Shown to a signed-in regular user whose profile is still incomplete
 * (`profileCompleted === false`), which happens after a Facebook OAuth sign-up
 * before they have chosen a username and password.
 *
 * Such users can reach the app's routes but see no data, so this notice acts as
 * a blocking overlay: it explains why the page is empty and offers two ways
 * out, completing the profile or logging out. It is intentionally not
 * dismissable (`persistent`), so the user cannot click around the empty app.
 *
 * It lives in the `user` layout, so it is rendered on every page a logged-in
 * user visits without having to add it to each page individually.
 */
const { t } = useI18n()
const localePath = useLocalePath()
const auth = useAuthStore()

// Only block the UI for a logged-in regular user who has not finished the
// OAuth sign-up. Admins/authors and completed users never see this.
const isVisible = computed(() =>
  auth.loggedIn
  && auth.user?.role === 'user'
  && auth.user?.profileCompleted === false,
)

// Send the user to the dedicated page where they pick a username + password.
function goToComplete() {
  navigateTo(localePath('/register/complete'))
}

// Let the user leave instead of completing the profile.
async function onLogout() {
  await auth.clear()
  await navigateTo(localePath('/'))
}
</script>

<template>
  <v-dialog
    :model-value="isVisible"
    persistent
    max-width="480"
    role="alertdialog"
    class="complete-profile-notice"
    :aria-label="t('auth.incompleteNoticeTitle')"
  >
    <v-card
      rounded="xl"
      class="text-center pa-2"
    >
      <v-card-text class="pt-8">
        <v-avatar
          size="72"
          color="primary"
          variant="tonal"
          class="mb-4"
        >
          <v-icon
            size="40"
            icon="mdi-account-alert-outline"
          />
        </v-avatar>

        <h2 class="text-headline-small font-weight-bold mb-2">
          {{ t('auth.incompleteNoticeTitle') }}
        </h2>

        <p class="text-body-2 text-medium-emphasis mb-2">
          {{ t('auth.incompleteNoticeText') }}
        </p>

        <p class="text-body-2 text-medium-emphasis">
          {{ t('auth.incompleteNoticeHint') }}
        </p>
      </v-card-text>

      <v-card-actions class="flex-column ga-2 px-6 pb-6">
        <v-btn
          color="primary"
          size="large"
          variant="flat"
          rounded="pill"
          block
          prepend-icon="mdi-account-edit-outline"
          @click="goToComplete"
        >
          {{ t('auth.incompleteNoticeAction') }}
        </v-btn>

        <v-btn
          variant="text"
          rounded="pill"
          block
          prepend-icon="mdi-logout"
          @click="onLogout"
        >
          {{ t('auth.logout') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
/* Blur the page behind the notice so the empty app is softened, not just
   dimmed. The scrim sits in an overlay sibling, so we reach it via :deep. */
.complete-profile-notice :deep(.v-overlay__scrim) {
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
}
</style>
