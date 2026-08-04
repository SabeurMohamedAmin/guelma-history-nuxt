<script setup lang="ts">
const { t, locale } = useI18n()
const {
  profile,
  pending,
  updateDisplayName,
  changeEmail,
  changePassword,
  uploadAvatar,
} = useAdminProfile()
const {
  sessions: mobileSessions,
  pending: mobileSessionsPending,
  revokeSession,
} = useAdminMobileSessions()

const editingName = ref(false)
const nameDraft = ref('')
const savingName = ref(false)
const uploadingAvatar = ref(false)
const passwordDialog = ref(false)
const emailDialog = ref(false)
const revokingSessionId = ref<string | null>(null)
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

async function onRevokeSession(sessionId: string) {
  revokingSessionId.value = sessionId
  try {
    await revokeSession(sessionId)
    notify(t('profile.mobileSessions.revoked'))
  }
  catch (error) {
    notify(extractErrorMessage(error, t('profile.mobileSessions.revokeError')), 'error')
  }
  finally {
    revokingSessionId.value = null
  }
}

definePageMeta({
  layout: 'admin',
  middleware: ['admin'],
})
</script>

<template>
  <section>
    <div class="mb-6">
      <p class="text-overline text-primary mb-1">
        {{ t('nav.admin') }}
      </p>
      <h1 class="text-headline-medium font-weight-bold">
        {{ t('profile.title') }}
      </h1>
    </div>

    <v-row
      v-if="profile"
      align="start"
    >
      <v-col
        cols="12"
        md="4"
      >
        <v-card
          rounded="xl"
          class="pa-4 text-center profile-card"
        >
          <admin-profile-avatar
            :display-name="profile.displayName"
            :username="profile.username"
            :has-avatar="profile.hasAvatar"
            :avatar-updated-at="profile.avatarUpdatedAt"
            :uploading="uploadingAvatar"
            @change="onAvatarChange"
          />

          <h2 class="text-headline-small font-weight-bold mt-4 mb-1">
            {{ displayName }}
          </h2>
          <p class="text-body-2 text-medium-emphasis mb-3">
            {{ profile.email }}
          </p>
          <v-chip
            color="primary"
            size="small"
            variant="tonal"
            prepend-icon="mdi-shield-account"
          >
            {{ t('nav.admin') }}
          </v-chip>
        </v-card>
      </v-col>

      <v-col
        cols="12"
        md="8"
      >
        <v-card
          rounded="xl"
          class="profile-card"
        >
          <v-list
            lines="two"
            class="py-0"
          >
            <v-list-item class="py-4">
              <template #prepend>
                <v-icon icon="mdi-account-outline" />
              </template>

              <v-list-item-subtitle>{{ t('profile.displayName') }}</v-list-item-subtitle>

              <div
                v-if="editingName"
                class="d-flex align-center ga-2 mt-2"
              >
                <v-text-field
                  v-model="nameDraft"
                  density="compact"
                  variant="outlined"
                  hide-details
                  autofocus
                  @keyup.enter="saveName"
                  @keyup.esc="cancelEditName"
                />
                <v-btn
                  icon="mdi-check"
                  color="primary"
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
              </div>

              <v-list-item-title
                v-else
                class="d-flex align-center ga-2 mt-1"
              >
                {{ profile.displayName || t('profile.noName') }}
                <v-btn
                  icon="mdi-pencil"
                  variant="text"
                  size="x-small"
                  @click="startEditName"
                />
              </v-list-item-title>
            </v-list-item>

            <v-divider />

            <v-list-item class="py-4">
              <template #prepend>
                <v-icon icon="mdi-email-outline" />
              </template>
              <v-list-item-subtitle>{{ t('auth.email') }}</v-list-item-subtitle>
              <v-list-item-title>{{ profile.email }}</v-list-item-title>
              <template #append>
                <v-btn
                  variant="tonal"
                  size="small"
                  @click="emailDialog = true"
                >
                  {{ t('profile.changeEmail') }}
                </v-btn>
              </template>
            </v-list-item>

            <v-divider />

            <v-list-item class="py-4">
              <template #prepend>
                <v-icon icon="mdi-lock-outline" />
              </template>
              <v-list-item-subtitle>{{ t('auth.password') }}</v-list-item-subtitle>
              <v-list-item-title>{{ passwordStatus }}</v-list-item-title>
              <template #append>
                <v-btn
                  variant="tonal"
                  size="small"
                  @click="passwordDialog = true"
                >
                  {{ t('profile.changePassword') }}
                </v-btn>
              </template>
            </v-list-item>

            <v-divider />

            <v-list-item class="py-4">
              <template #prepend>
                <v-icon icon="mdi-clock-outline" />
              </template>
              <v-list-item-subtitle>{{ t('profile.loggedInAt') }}</v-list-item-subtitle>
              <v-list-item-title>
                {{ profile.loggedInAt ? formatDateTime(profile.loggedInAt, localeCode) : '—' }}
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <v-card
      v-if="profile"
      rounded="xl"
      class="profile-card mt-6"
    >
      <v-card-item>
        <template #prepend>
          <v-icon icon="mdi-cellphone-lock" color="primary" />
        </template>
        <v-card-title>{{ t('profile.mobileSessions.title') }}</v-card-title>
        <v-card-subtitle>{{ t('profile.mobileSessions.subtitle') }}</v-card-subtitle>
      </v-card-item>

      <v-divider />

      <v-skeleton-loader
        v-if="mobileSessionsPending"
        type="list-item-two-line@2"
      />

      <v-list v-else-if="mobileSessions.length" lines="three">
        <template v-for="(session, index) in mobileSessions" :key="session.id">
          <v-list-item
            :prepend-icon="session.platform === 'ios' ? 'mdi-apple' : 'mdi-android'"
            :title="session.deviceName || t('profile.mobileSessions.unknownDevice')"
          >
            <v-list-item-subtitle>
              {{ session.platform }}<template v-if="session.appVersion"> · v{{ session.appVersion }}</template>
            </v-list-item-subtitle>
            <v-list-item-subtitle>
              {{ t('profile.mobileSessions.lastUsed', { date: formatDateTime(session.lastUsedAt, localeCode) }) }}
            </v-list-item-subtitle>
            <template #append>
              <v-btn
                color="error"
                variant="text"
                prepend-icon="mdi-logout-variant"
                :loading="revokingSessionId === session.id"
                :disabled="revokingSessionId !== null"
                @click="onRevokeSession(session.id)"
              >
                {{ t('profile.mobileSessions.revoke') }}
              </v-btn>
            </template>
          </v-list-item>
          <v-divider v-if="index < mobileSessions.length - 1" />
        </template>
      </v-list>

      <v-empty-state
        v-else
        icon="mdi-cellphone-off"
        :title="t('profile.mobileSessions.empty')"
        :text="t('profile.mobileSessions.emptyHint')"
      />
    </v-card>

    <v-skeleton-loader
      v-else-if="pending"
      type="card, list-item-two-line, list-item-two-line"
    />

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
  </section>
</template>

<style scoped>
.profile-card {
  border: 1px solid rgb(var(--v-border-color) / 0.12);
}
</style>
