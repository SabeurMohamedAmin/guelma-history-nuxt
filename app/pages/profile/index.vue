<script setup lang="ts">
/**
 * User profile page (/profile).
 *
 * Loads the signed-in user's real profile from the database via
 * `useUserProfile` and lets them edit their display name, email, password and
 * avatar. The layout follows the app's pattern: a gradient cover banner with an
 * overlapping avatar, the name/identity header, then grouped account cards.
 * The email/password dialogs and avatar uploader are the shared, role-agnostic
 * components driven by callbacks.
 */
const { t, locale } = useI18n()
const {
  profile,
  pending,
  updateDisplayName,
  changeEmail,
  changePassword,
  uploadAvatar,
} = useUserProfile()

const editingName = ref(false)
const nameDraft = ref('')
const savingName = ref(false)
const uploadingAvatar = ref(false)
const passwordDialog = ref(false)
const emailDialog = ref(false)
const snackbar = ref<{ show: boolean, text: string, color: 'success' | 'error' }>({
  show: false,
  text: '',
  color: 'success',
})

const localeCode = computed(() => (locale.value === 'ar' ? 'ar' : 'fr'))
const displayName = computed(() => profile.value?.displayName || profile.value?.username || '')
const passwordStatus = computed(() => {
  if (!profile.value?.passwordChangedAt) return t('profile.neverChanged')
  return t('profile.lastChanged', { date: formatDateTime(profile.value.passwordChangedAt, localeCode.value) })
})

function notify(text: string, color: 'success' | 'error' = 'success') {
  snackbar.value = { show: true, text, color }
}

function startEditName() {
  nameDraft.value = profile.value?.displayName ?? ''
  editingName.value = true
}

function cancelEditName() {
  editingName.value = false
  nameDraft.value = ''
}

async function saveName() {
  if (!nameDraft.value.trim()) {
    notify(t('profile.saveError'), 'error')
    return
  }

  savingName.value = true
  try {
    await updateDisplayName(nameDraft.value)
    editingName.value = false
    notify(t('profile.saved'))
  }
  catch (error) {
    notify(extractErrorMessage(error, t('profile.saveError')), 'error')
  }
  finally {
    savingName.value = false
  }
}

async function onAvatarChange(file: File) {
  uploadingAvatar.value = true
  try {
    await uploadAvatar(file)
    notify(t('profile.avatarUpdated'))
  }
  catch (error) {
    notify(extractErrorMessage(error, t('profile.avatarError')), 'error')
  }
  finally {
    uploadingAvatar.value = false
  }
}

async function onPasswordSubmit(current: string, next: string) {
  await changePassword(current, next)
  notify(t('profile.passwordUpdated'))
}

async function onEmailSubmit(email: string, current: string) {
  await changeEmail(email, current)
  notify(t('profile.emailUpdated'))
}

definePageMeta({
  middleware: ['profile-page'],
})
</script>

<template>
  <v-container class="py-8">
    <v-row justify="center">
      <v-col
        cols="12"
        md="10"
        lg="8"
      >
        <v-card
          v-if="profile"
          class="profile-card overflow-hidden"
          rounded="xl"
          elevation="8"
        >
          <!-- Gradient cover banner -->
          <div class="profile-cover"></div>

          <v-card-text class="pa-6 pa-md-8">
            <!-- Identity header: avatar overlaps the cover -->
            <div class="d-flex flex-column flex-md-row align-center align-md-end ga-4 profile-header">
              <user-profile-avatar
                :display-name="profile.displayName"
                :username="profile.username"
                :has-avatar="profile.hasAvatar"
                :avatar-updated-at="profile.avatarUpdatedAt"
                :uploading="uploadingAvatar"
                @change="onAvatarChange"
              />

              <div class="text-center text-md-start flex-grow-1">
                <h1 class="text-headline-small font-weight-bold mb-1">
                  {{ displayName }}
                </h1>
                <p class="text-body-2 text-medium-emphasis mb-2">
                  {{ profile.email }}
                </p>
                <v-chip
                  size="small"
                  color="primary"
                  variant="tonal"
                  prepend-icon="mdi-account-circle"
                >
                  {{ t('profile.roleUser') }}
                </v-chip>
              </div>
            </div>

            <v-divider class="my-6" />

            <!-- Personal information -->
            <div class="mb-2">
              <h2 class="text-subtitle-1 font-weight-bold">
                {{ t('profile.personalTitle') }}
              </h2>
              <p class="text-body-2 text-medium-emphasis">
                {{ t('profile.personalSubtitle') }}
              </p>
            </div>

            <v-row>
              <v-col
                cols="12"
                md="6"
              >
                <v-text-field
                  v-if="editingName"
                  v-model="nameDraft"
                  :label="t('profile.displayName')"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-account-outline"
                  autofocus
                  :loading="savingName"
                  @keyup.enter="saveName"
                  @keyup.esc="cancelEditName"
                >
                  <template #append-inner>
                    <v-btn
                      icon="mdi-check"
                      color="primary"
                      variant="text"
                      size="small"
                      :loading="savingName"
                      @click="saveName"
                    />
                    <v-btn
                      icon="mdi-close"
                      variant="text"
                      size="small"
                      @click="cancelEditName"
                    />
                  </template>
                </v-text-field>

                <v-text-field
                  v-else
                  :model-value="profile.displayName || t('profile.noName')"
                  :label="t('profile.displayName')"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-account-outline"
                  readonly
                  append-inner-icon="mdi-pencil"
                  @click:append-inner="startEditName"
                />
              </v-col>

              <v-col
                cols="12"
                md="6"
              >
                <v-text-field
                  :model-value="profile.username"
                  :label="t('profile.username')"
                  variant="outlined"
                  density="comfortable"
                  prepend-inner-icon="mdi-at"
                  readonly
                />
              </v-col>
            </v-row>

            <v-divider class="my-6" />

            <!-- Security -->
            <div class="mb-2">
              <h2 class="text-subtitle-1 font-weight-bold">
                {{ t('profile.securityTitle') }}
              </h2>
              <p class="text-body-2 text-medium-emphasis">
                {{ t('profile.securitySubtitle') }}
              </p>
            </div>

            <v-list
              class="py-0 rounded-lg security-list"
              lines="two"
            >
              <v-list-item class="py-3">
                <template #prepend>
                  <v-icon icon="mdi-email-outline" />
                </template>
                <v-list-item-subtitle>{{ t('auth.email') }}</v-list-item-subtitle>
                <v-list-item-title>{{ profile.email }}</v-list-item-title>
                <template #append>
                  <v-btn
                    variant="tonal"
                    size="small"
                    rounded="lg"
                    @click="emailDialog = true"
                  >
                    {{ t('profile.changeEmail') }}
                  </v-btn>
                </template>
              </v-list-item>

              <v-divider />

              <v-list-item class="py-3">
                <template #prepend>
                  <v-icon icon="mdi-lock-outline" />
                </template>
                <v-list-item-subtitle>{{ t('auth.password') }}</v-list-item-subtitle>
                <v-list-item-title>{{ passwordStatus }}</v-list-item-title>
                <template #append>
                  <v-btn
                    variant="tonal"
                    size="small"
                    rounded="lg"
                    @click="passwordDialog = true"
                  >
                    {{ t('profile.changePassword') }}
                  </v-btn>
                </template>
              </v-list-item>

              <v-divider />

              <v-list-item class="py-3">
                <template #prepend>
                  <v-icon icon="mdi-clock-outline" />
                </template>
                <v-list-item-subtitle>{{ t('profile.loggedInAt') }}</v-list-item-subtitle>
                <v-list-item-title>
                  {{ profile.loggedInAt ? formatDateTime(profile.loggedInAt, localeCode) : '—' }}
                </v-list-item-title>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>

        <v-skeleton-loader
          v-else-if="pending"
          type="image, list-item-avatar-two-line, list-item-two-line, list-item-two-line"
          class="rounded-xl"
        />
      </v-col>
    </v-row>

    <admin-change-password-dialog
      v-model:open="passwordDialog"
      :submit="onPasswordSubmit"
    />
    <admin-change-email-dialog
      v-if="profile"
      v-model:open="emailDialog"
      :current-email="profile.email"
      :submit="onEmailSubmit"
    />

    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      timeout="3000"
    >
      {{ snackbar.text }}
    </v-snackbar>
  </v-container>
</template>

<style scoped>
.profile-card {
  border: 1px solid rgb(var(--v-border-color) / 0.12);
}

.profile-cover {
  height: 160px;
  background: linear-gradient(135deg, rgb(var(--v-theme-primary)) 0%, rgb(103, 80, 164) 100%);
}

/* Pull the identity header up so the avatar overlaps the cover banner. */
.profile-header {
  margin-top: -72px;
  position: relative;
  z-index: 2;
}

.security-list {
  border: 1px solid rgb(var(--v-border-color) / 0.12);
}

@media (max-width: 959px) {
  .profile-cover {
    height: 130px;
  }

  .profile-header {
    margin-top: -64px;
  }
}
</style>
